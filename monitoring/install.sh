#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f values.yaml --wait --timeout 10m

kubectl apply -f backend-servicemonitor.yaml
kubectl apply -f backend-dashboard.yaml

echo "Grafana: http://grafana.localhost (admin / admin)"
