#!/usr/bin/env bash
set -euo pipefail

kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# ArgoCD's CRDs exceed kubectl's client-side apply annotation size limit,
# so this must be applied server-side.
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

kubectl -n argocd wait --for=condition=available deployment/argocd-server --timeout=180s

# Expose the UI on a fixed NodePort (30443), mapped to host port 8443 via
# kind-config.yaml's extraPortMappings.
kubectl -n argocd patch svc argocd-server -p \
  '{"spec":{"type":"NodePort","ports":[{"name":"http","port":80,"targetPort":8080,"protocol":"TCP"},{"name":"https","port":443,"targetPort":8080,"protocol":"TCP","nodePort":30443}]}}'
