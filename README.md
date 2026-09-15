# three-tier-devsecops-k8s

End-to-end three-tier DevSecOps pipeline, built entirely on free/self-hosted
tooling (no AWS/Azure billing). Sample application is a Snake game with a
persisted leaderboard.

## Stack

| Concern              | Tool                          |
| --------------------- | ------------------------------ |
| Frontend               | React + Vite, served via nginx |
| Backend                | Node.js + Express              |
| Database                | MongoDB                        |
| Kubernetes              | kind (Kubernetes-in-Docker)    |
| CI                      | Jenkins (self-hosted)          |
| SAST / code quality      | SonarQube (self-hosted)        |
| Vulnerability scanning    | Trivy                          |
| GitOps CD                | ArgoCD                         |
| Monitoring                | Prometheus + Grafana           |

## Repository layout

```
application-code/
  backend/     Express API (leaderboard endpoints), Dockerfile
  frontend/    React Snake game + leaderboard UI, Dockerfile (nginx)
kind/
  kind-config.yaml    kind cluster topology (1 control-plane + 2 workers)
  setup-cluster.sh    creates the cluster and installs ingress-nginx
kubernetes-manifests/
  namespace.yaml
  mongo/       Deployment, PVC, Service
  backend/     ConfigMap, Secret, Deployment, Service
  frontend/    Deployment, Service
  ingress.yaml
docker-compose.yml    local three-tier stack without Kubernetes
```

## Running locally with Docker Compose

```bash
docker compose up -d --build
```

App available at http://localhost:8080.

## Running on kind (Kubernetes)

```bash
bash kind/setup-cluster.sh

docker build -t snake-backend:local application-code/backend
docker build -t snake-frontend:local application-code/frontend
kind load docker-image snake-backend:local snake-frontend:local --name three-tier-devsecops

kubectl apply -f kubernetes-manifests/namespace.yaml
kubectl apply -f kubernetes-manifests/mongo/
kubectl apply -f kubernetes-manifests/backend/
kubectl apply -f kubernetes-manifests/frontend/
kubectl apply -f kubernetes-manifests/ingress.yaml
```

App available at http://localhost/.

Tear down with:

```bash
kind delete cluster --name three-tier-devsecops
```

## Status

- [x] Snake game frontend + leaderboard backend + MongoDB
- [x] Local orchestration via Docker Compose
- [x] kind cluster + Kubernetes manifests
- [ ] Jenkins CI pipeline
- [ ] SonarQube integration
- [ ] Trivy vulnerability scanning
- [ ] ArgoCD GitOps deployment
- [ ] Prometheus + Grafana monitoring
