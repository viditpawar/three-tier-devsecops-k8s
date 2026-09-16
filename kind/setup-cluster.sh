#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_NAME="$(grep '^name:' "$SCRIPT_DIR/kind-config.yaml" | awk '{print $2}')"

kind create cluster --config "$SCRIPT_DIR/kind-config.yaml"

if [ -f /.dockerenv ]; then
  echo "Running inside a container, joining the kind network and using the internal kubeconfig"
  docker network connect kind "$(hostname)" 2>/dev/null || true
  mkdir -p "$HOME/.kube"
  kind get kubeconfig --internal --name "$CLUSTER_NAME" > "$HOME/.kube/config"
fi

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Pin the controller to the ingress-ready node: it owns the host port mappings
# for 80/443 (see kind-config.yaml), and upstream's manifest doesn't always
# enforce this itself.
kubectl -n ingress-nginx patch deployment ingress-nginx-controller \
  --type=merge -p '{"spec":{"template":{"spec":{"nodeSelector":{"ingress-ready":"true"}}}}}'

kubectl -n ingress-nginx rollout status deployment ingress-nginx-controller --timeout=180s

kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s
