
pipeline {
  agent any

  environment {
    NEXUS_REGISTRY = "192.168.32.128:8082"
    IMAGE_NAME     = "192.168.32.128:8082/backend"
    IMAGE_TAG      = "${env.GIT_COMMIT[0..7]}"
  // Load secrets from Jenkins credentials
    SUPABASE_URL         = credentials('SUPABASE_URL')
    SUPABASE_ANON_KEY    = credentials('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY = credentials('SUPABASE_SERVICE_KEY')
    GOOGLE_CLIENT_ID     = credentials('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = credentials('GOOGLE_CLIENT_SECRET')
    JWT_SECRET           = credentials('JWT_SECRET')

    // Non-secret env vars (safe to hardcode)
    NODE_ENV             = "test"
    PORT                 = "3000"
    GOOGLE_CALLBACK_URL  = "http://localhost:3000/auth/google/callback"
    FACEBOOK_CALLBACK_URL= "http://localhost:3000/auth/facebook/callback"
    KEYCLOAK_AUTH_SERVER_URL = "http://localhost:8180"
    KEYCLOAK_REALM       = "master"
    KEYCLOAK_RESOURCE    = "app"
    DATABASE_URL         = "postgresql://postgres:1234@localhost:5432/deepskyn?schema=public"
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

  

 