pipeline {
  agent any

  environment {
    NEXUS_REGISTRY = "192.168.32.128:8082"
    IMAGE_NAME     = "192.168.32.128:8082/backend"
    IMAGE_TAG = "${env.GIT_COMMIT[0..7]}"
  }

 

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Verify Node Runtime') {
      steps {
        sh '''
          node --version
          npm --version
        '''
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Test + Coverage') {
      steps {
        sh 'npm run test:cov'
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube') {
          withEnv(["PATH+SONAR=${tool 'SonarScanner'}/bin"]) {
            sh '''
              sonar-scanner \
                -Dsonar.projectKey=backend \
                -Dsonar.sources=src \
                -Dsonar.tests=src \
                -Dsonar.test.inclusions=src/**/*.spec.ts \
                -Dsonar.exclusions=node_modules/**,dist/**,coverage/**,**/*.js \
                -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info \
                -Dsonar.typescript.tsconfigPath=tsconfig.json \
                -Dsonar.sourceEncoding=UTF-8
            '''
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        script {
          withCredentials([string(credentialsId: 'sonar-password', variable: 'SONAR_PASS')]) {
            def taskId = sh(
              script: "grep 'ceTaskId' .scannerwork/report-task.txt | cut -d'=' -f2",
              returnStdout: true
            ).trim()

            echo "Polling SonarQube task: ${taskId}"

            timeout(time: 5, unit: 'MINUTES') {
              waitUntil(initialRecurrencePeriod: 5000) {
                def status = sh(
                  script: """
                    curl -s -u admin:\$SONAR_PASS \
                      "http://localhost:9000/api/ce/task?id=${taskId}" \
                      | python3 -c "import sys,json; print(json.load(sys.stdin)['task']['status'])"
                  """,
                  returnStdout: true
                ).trim()
                echo "Task status: ${status}"
                return (status == 'SUCCESS' || status == 'FAILED' || status == 'CANCELLED')
              }
            }

            def gate = sh(
              script: """
                curl -s -u admin:\$SONAR_PASS \
                  "http://localhost:9000/api/qualitygates/project_status?projectKey=backend" \
                  | python3 -c "import sys,json; print(json.load(sys.stdin)['projectStatus']['status'])"
              """,
              returnStdout: true
            ).trim()

            echo "Quality Gate: ${gate}"
            if (gate != 'OK') {
              error "Quality Gate FAILED: ${gate}"
            }
          }
        }
      }
    }

    stage('Docker Build') {
      steps {
        timeout(time: 20, unit: 'MINUTES') {
          sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
          sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
        }
      }
    }

    stage('Push to Nexus') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'nexus-credentials',
          usernameVariable: 'NEXUS_USER',
          passwordVariable: 'NEXUS_PASS'
        )]) {
          sh """
            echo \$NEXUS_PASS | docker login ${NEXUS_REGISTRY} \
              -u \$NEXUS_USER --password-stdin
            docker push ${IMAGE_NAME}:${IMAGE_TAG}
            docker push ${IMAGE_NAME}:latest
          """
        }
      }
    }

    stage('Trigger CD') {
      steps {
        build job: 'backend-cd',
          parameters: [string(name: 'IMAGE_TAG', value: "${IMAGE_TAG}")],
          wait: false
      }
    }

  }

  post {
    always {
      sh "docker logout ${NEXUS_REGISTRY} || true"
    }
    success {
      echo "✅ CI passed — image pushed to Nexus: ${IMAGE_NAME}:${IMAGE_TAG}"
    }
    failure {
      echo "❌ CI failed — check SonarQube gate or Docker logs"
    }
  }
}