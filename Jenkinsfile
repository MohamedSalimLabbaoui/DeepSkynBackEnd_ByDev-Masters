pipeline {
  agent any

  environment {
    NEXUS_REGISTRY = "192.168.32.128:8082"
    IMAGE_NAME     = "192.168.32.128:8082/backend"
    IMAGE_TAG      = "${env.GIT_COMMIT[0..7]}"

    // Supabase
    SUPABASE_URL         = "https://hvbozosvbaomckuvxjlf.supabase.co"
    SUPABASE_ANON_KEY    = "sb_publishable_tmV6ColJ-EwUpfQV4j0n5A_0eTZa4Ib"
    SUPABASE_SERVICE_KEY = "sb_publishable_tmV6ColJ-EwUpfQV4j0n5A_0eTZa4Ib"
    SUPABASE_BUCKET      = "deepskyn-images"

    // Google OAuth
    GOOGLE_CLIENT_ID      = "130784491755-c8qcnvdjvkt4bba6i2lqb0evs8dtn3vi.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET  = "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"
    GOOGLE_CALLBACK_URL   = "http://localhost:3000/auth/google/callback"

    // Facebook OAuth
    FACEBOOK_APP_ID       = "892771800044653"
    FACEBOOK_APP_SECRET   = "dec30686060df2e6e5bf87dab5df8e1e"
    FACEBOOK_CALLBACK_URL = "http://localhost:3000/auth/facebook/callback"

    // JWT
    JWT_SECRET     = "super-secret-key-change-me-in-production"
    JWT_EXPIRATION = "7d"

    // Keycloak
    KEYCLOAK_AUTH_SERVER_URL  = "http://localhost:8180"
    KEYCLOAK_REALM            = "master"
    KEYCLOAK_RESOURCE         = "app"
    KEYCLOAK_SECRET           = "BnjMAba0uBKFIyyOGy12f7QP1pqHirnJ"
    KEYCLOAK_SSL_REQUIRED     = "external"
    KEYCLOAK_ADMIN_USER       = "admin"
    KEYCLOAK_ADMIN_PASSWORD   = "admin"

    // Database
    DB_HOST       = "localhost"
    DB_PORT       = "5432"
    DB_USERNAME   = "postgres"
    DB_PASSWORD   = "1234"
    DB_NAME       = "deepskyn"
    DATABASE_URL  = "postgresql://postgres:1234@localhost:5432/deepskyn?schema=public"

    // Gemini
    GEMINI_API_KEY = "AIzaSyBrNy4xc7_rSzBu7PkWhL6Uh2uGqM0mk5A"

    // Mail
    MAIL_HOST     = "smtp.gmail.com"
    MAIL_PORT     = "587"
    MAIL_USER     = "saidazizz132@gmail.com"
    MAIL_PASSWORD = "your-app-password"
    MAIL_FROM     = "DeepSkyn <noreply@deepskyn.com>"

    // Stripe
    STRIPE_SECRET_KEY              = "sk_test_51TFd8v7Xyev9Z69AOgz4dvC0uq7VV7H8SsfYjJx7G87XTWpEr3XZumqxsLoC4CCfL0mhoDZnSsvMfKgMDxCr4jND00JsAzIC2g"
    STRIPE_WEBHOOK_SECRET          = "whsec_4e8b2afcb1bc05fc5147ec6964cbf010c419c3cd34ecf2c744a87dea8e4e05a1"
    STRIPE_PRICE_ID_PREMIUM_MONTHLY = "price_1TFdEo7Xyev9Z69AXd67tkoN"
    STRIPE_PRICE_ID_PREMIUM_YEARLY  = "price_1TFdFS7Xyev9Z69AHDGDtLeW"

    // Recaptcha
    RECAPTCHA_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"

    // App
    NODE_ENV     = "test"
    PORT         = "3000"
    FRONTEND_URL = "http://localhost:5173"
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
      echo "❌ CI failed — check test logs or SonarQube"
    }
  }
}