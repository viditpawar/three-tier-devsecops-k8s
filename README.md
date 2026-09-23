# three-tier-devsecops-k8s

End-to-end three-tier DevSecOps pipeline, built entirely on free/self-hosted
tooling (no AWS/Azure billing). Sample application is a Snake game with a
persisted leaderboard.

## Stack

| Concern                 | Tool                           |
| ------------------------ | ------------------------------- |
| Frontend                 | React + Vite, served via nginx  |
| Backend                  | Node.js + Express               |
| Database                 | MongoDB                         |
| Kubernetes                | kind (Kubernetes-in-Docker)     |
| CI                        | Jenkins (self-hosted)           |
| SAST / code quality        | SonarQube (self-hosted)         |
| Vulnerability scanning      | Trivy                           |
| GitOps CD                  | ArgoCD                          |
| Monitoring                  | Prometheus + Grafana            |

## Repository layout

```
application-code/
  backend/     Express API (leaderboard endpoints), unit tests, Dockerfile
  frontend/    React Snake game + leaderboard UI, Dockerfile (nginx)
Jenkinsfile    CI/CD pipeline: test -> SonarQube -> Trivy -> build -> deploy
jenkins/
  Dockerfile, docker-compose.yml    self-hosted Jenkins (docker/kubectl/kind/trivy/sonar-scanner preinstalled)
sonarqube/
  docker-compose.yml    self-hosted SonarQube + Postgres
argocd/
  install.sh          installs ArgoCD into the kind cluster, exposes UI on NodePort 30443
  application.yaml    ArgoCD Application tracking kubernetes-manifests/
kind/
  kind-config.yaml    kind cluster topology (1 control-plane + 2 workers)
  setup-cluster.sh    creates the cluster and installs ingress-nginx
kubernetes-manifests/
  namespace.yaml
  mongo/       Deployment, PVC, Service
  backend/     ConfigMap, Secret, Deployment, Service
  frontend/    Deployment, Service
  ingress.yaml
  network-policies.yaml
docker-compose.yml    local three-tier stack without Kubernetes
monitoring/
  values.yaml, install.sh    kube-prometheus-stack via Helm
  backend-servicemonitor.yaml, backend-dashboard.yaml, backend-alerts.yaml
```

## Running locally with Docker Compose

```bash
docker compose up -d --build
```

App available at http://localhost:8080.

## Running on kind (Kubernetes)

For a one-off manual deploy without the full CI pipeline:

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
kubectl apply -f kubernetes-manifests/network-policies.yaml
```

App available at http://localhost/.

Tear down with:

```bash
kind delete cluster --name three-tier-devsecops
```

The Jenkins pipeline (below) automates this whole sequence, tagging images
with the Jenkins build number instead of `:local`.

## CI: Jenkins

Self-hosted Jenkins with Docker (docker-outside-of-docker), kubectl, kind,
Trivy and sonar-scanner preinstalled in its image.

```bash
cd jenkins
docker compose up -d --build
```

Jenkins is at http://localhost:8081. On first run, get the initial admin
password with:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Complete the setup wizard (install suggested plugins, create an admin user),
then create the pipeline job:

1. **New Item** -> name it `snake-three-tier` -> type **Pipeline** -> OK
2. Under **Pipeline**, set Definition to **Pipeline script from SCM**
3. SCM: **Git**, Repository URL: this repo's URL, Branch: `*/main`,
   Script Path: `Jenkinsfile`
4. Save

The pipeline needs a SonarQube token (see below) added as a Jenkins
credential before it can run successfully.

Because there's no container registry in this local setup, the pipeline
builds images tagged with the Jenkins build number and loads them directly
into the kind cluster via `kind load docker-image`, then imperatively bumps
the running Deployments with `kubectl set image`.

## Code quality & security: SonarQube

```bash
cd sonarqube
docker compose up -d
```

SonarQube is at http://localhost:9000 (default login `admin` / `admin`, it
will force a password change). Generate a token under **My Account ->
Security** and add it to Jenkins as a **Secret text** credential with ID
`sonar-token` (**Manage Jenkins -> Credentials**).

The pipeline runs `sonar-scanner` against both `application-code/backend`
and `application-code/frontend`, waits on the Quality Gate result
(`sonar.qualitygate.wait=true`), and fails the build if it doesn't pass. The
backend's test suite (`npm test`, using Node's built-in test runner + `c8`)
feeds coverage into this gate via `sonar.javascript.lcov.reportPaths`.

## Vulnerability scanning: Trivy

No separate setup — Trivy ships inside the Jenkins image. The pipeline runs
three scans, currently in report-only mode (`--exit-code 0`, so findings are
visible in the Jenkins console log but don't block the build):

- `trivy fs` against each app directory (dependency CVEs)
- `trivy config` against `kubernetes-manifests/` (misconfigurations)
- `trivy image` against both built images (HIGH/CRITICAL CVEs)

## GitOps CD: ArgoCD

```bash
bash argocd/install.sh
kubectl apply -f argocd/application.yaml
```

UI is at https://localhost:8443 (self-signed cert; accept the browser
warning). Get the initial admin password with:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

The `snake-three-tier` Application tracks `kubernetes-manifests/` on `main`,
but **sync is manual, not automated**. Since there's no registry for git to
track image digests, Jenkins deploys real image tags imperatively after each
build; an automated sync would reapply git's placeholder `:local` tags on
every push and clobber Jenkins' live deploy. Trigger a sync from the ArgoCD
UI when the baseline manifests themselves change (namespace, services,
ingress, configmaps, network policies).

## Monitoring: Prometheus + Grafana

The backend exposes Prometheus metrics at `/metrics` (default Node metrics
plus `http_request_duration_seconds`). Requires `helm`.

```bash
bash monitoring/install.sh
```

Grafana is at http://grafana.localhost (admin / admin); the "Snake Backend"
dashboard shows request rate, p95 latency, 5xx rate and pod resource usage.
Rebuild and redeploy the backend image first so `/metrics` exists.

`backend-alerts.yaml` defines alerts for backend down, >5% 5xx rate and p95
latency >1s. Alertmanager is disabled, so they show in the Prometheus UI
(Alerts tab) only.

## Testing

```bash
cd application-code/backend
npm test
```

Runs the backend's unit tests (Node's built-in test runner + `supertest`)
with `c8` coverage, writing `coverage/lcov.info` for SonarQube. Tests mock
the Mongoose model rather than hitting a real database.

## Hardening

- Pods run as non-root with `seccompProfile: RuntimeDefault`, no privilege
  escalation, dropped capabilities, and no mounted service-account token
  (backend also has a read-only root filesystem).
- `kubernetes-manifests/network-policies.yaml` denies all ingress in the
  `three-tier` namespace except ingress-nginx -> frontend -> backend -> mongo
  and Prometheus -> backend.
- The Jenkins pipeline runs `trivy config` against the manifests.

## Running everything together

All of the above are independent Docker Compose stacks / cluster add-ons
sharing the host's Docker daemon, so start them in this order:

```bash
bash kind/setup-cluster.sh
(cd jenkins && docker compose up -d --build)
(cd sonarqube && docker compose up -d)
bash argocd/install.sh
bash monitoring/install.sh
```

Then create the Jenkins pipeline job and `sonar-token` credential as
described above, and trigger a build.
