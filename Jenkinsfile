pipeline {
    agent any

    environment {
        CLUSTER_NAME   = 'three-tier-devsecops'
        NAMESPACE      = 'three-tier'
        BACKEND_IMAGE  = "snake-backend:${env.BUILD_NUMBER}"
        FRONTEND_IMAGE = "snake-frontend:${env.BUILD_NUMBER}"
        KUBECONFIG     = "${env.WORKSPACE}/kubeconfig"
        SONAR_HOST_URL = 'http://host.docker.internal:9000'
    }

    stages {
        stage('Backend: Install & Test') {
            steps {
                dir('application-code/backend') {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
        }

        stage('Frontend: Install & Build') {
            steps {
                dir('application-code/frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    dir('application-code/backend') {
                        sh '''
                            sonar-scanner \
                                -Dsonar.projectKey=snake-backend \
                                -Dsonar.sources=src \
                                -Dsonar.host.url=${SONAR_HOST_URL} \
                                -Dsonar.token=${SONAR_TOKEN} \
                                -Dsonar.qualitygate.wait=true
                        '''
                    }
                    dir('application-code/frontend') {
                        sh '''
                            sonar-scanner \
                                -Dsonar.projectKey=snake-frontend \
                                -Dsonar.sources=src \
                                -Dsonar.exclusions=**/dist/**,**/node_modules/** \
                                -Dsonar.host.url=${SONAR_HOST_URL} \
                                -Dsonar.token=${SONAR_TOKEN} \
                                -Dsonar.qualitygate.wait=true
                        '''
                    }
                }
            }
        }

        stage('Trivy: Filesystem Scan') {
            steps {
                sh '''
                    trivy fs --severity HIGH,CRITICAL --exit-code 0 application-code/backend
                    trivy fs --severity HIGH,CRITICAL --exit-code 0 application-code/frontend
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${BACKEND_IMAGE} application-code/backend"
                sh "docker build -t ${FRONTEND_IMAGE} application-code/frontend"
            }
        }

        stage('Trivy: Image Scan') {
            steps {
                sh '''
                    trivy image --severity HIGH,CRITICAL --exit-code 0 ${BACKEND_IMAGE}
                    trivy image --severity HIGH,CRITICAL --exit-code 0 ${FRONTEND_IMAGE}
                '''
            }
        }

        stage('Ensure kind Cluster') {
            steps {
                sh '''
                    if kind get clusters | grep -q "^${CLUSTER_NAME}$" \
                        && ! docker inspect -f "{{.State.Running}}" ${CLUSTER_NAME}-control-plane 2>/dev/null | grep -q true; then
                        echo "Found a stale/half-created cluster, removing it"
                        kind delete cluster --name ${CLUSTER_NAME}
                    fi

                    if ! kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
                        bash kind/setup-cluster.sh
                    fi

                    docker network connect kind "$(hostname)" 2>/dev/null || true
                '''
            }
        }

        stage('Load Images into kind') {
            steps {
                sh "kind load docker-image ${BACKEND_IMAGE} ${FRONTEND_IMAGE} --name ${CLUSTER_NAME}"
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    kind get kubeconfig --internal --name ${CLUSTER_NAME} > ${KUBECONFIG}

                    kubectl apply -f kubernetes-manifests/namespace.yaml
                    kubectl apply -f kubernetes-manifests/mongo/
                    kubectl apply -f kubernetes-manifests/backend/
                    kubectl apply -f kubernetes-manifests/frontend/
                    kubectl apply -f kubernetes-manifests/ingress.yaml

                    kubectl -n ${NAMESPACE} set image deployment/backend backend=${BACKEND_IMAGE}
                    kubectl -n ${NAMESPACE} set image deployment/frontend frontend=${FRONTEND_IMAGE}

                    kubectl -n ${NAMESPACE} rollout status deployment/backend --timeout=180s
                    kubectl -n ${NAMESPACE} rollout status deployment/frontend --timeout=180s
                '''
            }
        }
    }

    post {
        always {
            sh 'rm -f ${KUBECONFIG}'
        }
    }
}
