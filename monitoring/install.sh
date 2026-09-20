#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# The Grafana ingress is validated by ingress-nginx's admission webhook, so the
# controller must be up first.
kubectl -n ingress-nginx wait --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=180s

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f values.yaml --wait --timeout 10m

kubectl apply -f backend-servicemonitor.yaml
kubectl apply -f backend-dashboard.yaml
kubectl apply -f backend-alerts.yaml

echo "Grafana: http://grafana.localhost (admin / admin)"
