FROM jenkins/jenkins:lts-jdk17

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io docker-cli curl ca-certificates gnupg \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /usr/local/bin/kubectl \
  "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
  && chmod +x /usr/local/bin/kubectl

RUN curl -fsSL -o /usr/local/bin/kind \
  "https://kind.sigs.k8s.io/dl/v0.32.0/kind-linux-amd64" \
  && chmod +x /usr/local/bin/kind

RUN curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor -o /usr/share/keyrings/trivy.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" > /etc/apt/sources.list.d/trivy.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends trivy unzip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /tmp/sonar-scanner.zip \
  "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-6.2.1.4610-linux-x64.zip" \
  && unzip -q /tmp/sonar-scanner.zip -d /opt \
  && mv /opt/sonar-scanner-6.2.1.4610-linux-x64 /opt/sonar-scanner \
  && rm /tmp/sonar-scanner.zip \
  && ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner

USER jenkins
