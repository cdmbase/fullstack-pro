// Global Variable so it can be changed between stages
def GIT_BRANCH_NAME=getGitBranchName()

pipeline {
  agent {
    kubernetes{
      label 'slave-2cpu-8gb'
    }
  }
  parameters {
    string(name: 'REPOSITORY_SERVER', defaultValue: 'gcr.io/stack-test-186501', description: 'Registry server URL to pull/push images', trim: true)
    string(name: 'NAMESPACE', defaultValue: 'default', description: 'In which namespace micro services needs to be deploy', trim: true)
    string(name: 'CONNECTION_ID', defaultValue: 'test', description: 'connection id', trim: true)
    string(name: 'WORKSPACE_ID', defaultValue: 'fullstack-pro', description: 'workspace id', trim: true)
    string(name: 'UNIQUE_NAME', defaultValue: 'default', description: 'chart name', trim: true)
    string(name: 'HEMERA_LOG_LEVEL', defaultValue: 'info', description: 'log level for hemera')
    string(name: 'LOG_LEVEL', defaultValue: 'info', description: 'log level')
    string(name: 'DOMAIN_NAME', defaultValue: 'cdebase.io', description: 'domain of the ingress')
    string(name: 'DEPLOYMENT_PATH', defaultValue: '/servers', description: 'folder path to load helm charts')
    string(name: 'PUBLISH_BRANCH', defaultValue: 'devpublish', description: 'publish branch')
    string(name: 'EXCLUDE_SETTING_NAMESPACE_FILTER', defaultValue: 'brigade', description: 'exclude setting namespace that matches search string')
    string(name: 'GIT_CREDENTIAL_ID', defaultValue: 'fullstack-pro-github-deploy-key', description: 'jenkins credential id of git deploy secret')
    string(name: 'REPOSITORY_SSH_URL', defaultValue: 'git@github.com:cdmbase/fullstack-pro.git', description: 'ssh url of the git repository')
    string(name: 'REPOSITORY_BRANCH', defaultValue: 'develop', description: 'the branch of repository')

    // by default first value of the choice will be choosen
    choice choices: ['auto', 'force'], description: 'Choose merge strategy', name: 'NPM_PUBLISH_STRATEGY'
    choice choices: ['yarn', 'npm'], description: 'Choose build strategy', name: 'BUILD_STRATEGY'
    choice choices: ['0.3.0', '0.1.22'], description: 'Choose Idestack chart version', name: 'IDESTACK_CHART_VERSION'
    choice choices: ['buildOnly', 'buildAndTest', 'buildAndPublish', 'devDeploy', 'stageDeploy', 'prodDeploy', 'ProdWithBuild', 'allenv'], description: 'Where to deploy micro services?', name: 'ENV_CHOICE'
    booleanParam (defaultValue: false, description: 'Tick to enable debug mode', name: 'DEBUG')
    string(name: 'BUILD_TIME_OUT', defaultValue: '120', description: 'Build timeout in minutes', trim: true)
  }

  // Setup common + secret key variables for pipeline.
  environment {
    BUILD_COMMAND = getBuildCommand()
    PYTHON='/usr/bin/python'
    GCR_KEY = credentials('jenkins-gcr-login-key')
    GIT_PR_BRANCH_NAME = getGitPrBranchName()
    GITHUB_HELM_REPO_TOKEN = credentials('github-helm-repo-access-token')
  }

  // Initialize npm and docker commands using plugins
  tools {
    nodejs 'nodejs'
  }

  stages {

    stage('define environment') {
      steps {
        scmSkip(deleteBuild: true, skipPattern:'.*skip.*ci.*')
        checkout([$class: 'GitSCM', branches: [[name: '*/'+ params.REPOSITORY_BRANCH]],
        doGenerateSubmoduleConfigurations: false, extensions: [[$class: 'WipeWorkspace']],
        submoduleCfg: [], userRemoteConfigs: [[credentialsId: params.GIT_CREDENTIAL_ID, url: params.REPOSITORY_SSH_URL]]])
        sh "git checkout ${env.GIT_PR_BRANCH_NAME}"

        // env.NODEJS_HOME = "${tool 'node_v8'}"
  	    // env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
  	    //sh 'npm --version'
      }
    }

    stage('Unlock secrets'){ //unlock keys for all runs
      environment{ deployment_env = 'dev' }
      steps{
        sh '''
           gpg --import /tmp/gpg-public-key/gpg-public-key.pub
           gpg --import /tmp/gpg-private-key/gpg-private-key.key
           git-crypt unlock
        '''
        load "./jenkins_variables.groovy"
        // if we need to load stag configuration for different location.
        // sh "curl -H 'Authorization: token ${env.GITHUB_ACCESS_TOKEN}' -H 'Accept: application/vnd.github.v3.raw' -O -L https://raw.githubusercontent.com/cdmbase/kube-orchestration/master/idestack/values-stage.yaml"
      }
    }

    // Install packages. If
    // a. any branch
    // b. ENV_CHOICE set not selected `dev`, `stage` or `prod`
    stage ('Install git repository'){
       steps{
          sh """
            echo "what is docker git version $GIT_BRANCH_NAME -- ${params.ENV_CHOICE}"
            ${params.BUILD_STRATEGY} install
            ${params.BUILD_STRATEGY} run lerna
          """
       }
    }

    // Run build for all cases except when ENV_CHOICE is 'buildAndPublish' and `dev`, `stage` or `prod`
    stage ('Build packages'){
      steps{
        sh """
          ${params.BUILD_STRATEGY} run build
        """
      }
    }

    // Test build for all cases except when ENV_CHOICE is 'buildAndPublish' and `dev`, `stage` or `prod`
    stage ('Test packages'){
      when {
        expression { params.ENV_CHOICE == 'buildAndTest' }
      }
      steps{
        sh """
          ${params.BUILD_STRATEGY} run test
        """
      }
    }

    // if PR is from branch other than `develop` then merge to `develop` if we chose ENV_CHOICE as 'buildAndPublish'.
    stage ('Merge PR to `develop` branch and publish'){
      when {
        expression { GIT_BRANCH_NAME == 'develop' || GIT_BRANCH_NAME == 'devpublish' }
        expression { params.ENV_CHOICE == 'buildAndPublish' || params.ENV_CHOICE == 'allenv' }
      }
      steps{
        sh """
          git checkout develop
          git merge ${env.GIT_PR_BRANCH_NAME} -m 'auto merging'
          ${params.BUILD_STRATEGY} install
          ${params.BUILD_STRATEGY} run lerna
          ${params.BUILD_STRATEGY} run build
        """
        script {
          GIT_BRANCH_NAME = 'develop'
        }
      }
    }

    // publish packages to npm repository.
    // commit new package-lock.json that might get generated during install
    // Build will be ignore with tag '[skip ci]'
    stage ('Publish packages'){
      when {
        expression { GIT_BRANCH_NAME == 'develop' }
        expression { params.ENV_CHOICE == 'buildOnly' ||  params.ENV_CHOICE == 'buildAndPublish' }
      }
      steps{
        script {
          GIT_BRANCH_NAME=params.PUBLISH_BRANCH
        }
        sshagent (credentials: [params.GIT_CREDENTIAL_ID]) {
          sh """
            git add -A
            git diff --staged --quiet || git commit -am 'auto build\r\n[skip ci]'
            git fetch origin develop
            git checkout develop
            ${params.BUILD_STRATEGY} run devpublish:${params.NPM_PUBLISH_STRATEGY};
            git push origin develop
            git checkout ${params.PUBLISH_BRANCH}
          """
        }
      }
    }

    stage('Docker login'){
      steps{
        sh 'cat "$GCR_KEY" | docker login -u _json_key --password-stdin https://gcr.io'
      }
    }

    stage('Dev Docker Images') {
      options {
         timeout(time: params.BUILD_TIME_OUT, unit: 'MINUTES')
       }
      when {
        expression { params.ENV_CHOICE == 'allenv' || params.ENV_CHOICE == 'buildOnly' || params.ENV_CHOICE == 'buildAndPublish' }
      }

      // Below variable is only set to load all (variables, functions) from jenkins_variables.groovy file.
      environment{ deployment_env = 'dev' }
        steps{
          load "./jenkins_variables.groovy"
          script {
            def servers = getDirs(pwd() + params.DEPLOYMENT_PATH)
            def parallelStagesMap = servers.collectEntries {
             ["${it}" : generateBuildStage(it)]
            }
            parallel parallelStagesMap
          }
        }
    }

  // Below are dev stages
    stage('Dev deployment') {
      environment{
          deployment_env = 'dev'
          DOMAIN_NAME = 'cdebase.io'
      }
      when {
        expression { params.ENV_CHOICE == 'devDeploy' || params.ENV_CHOICE == 'allenv' || params.ENV_CHOICE == 'buildAndPublish' }
        beforeInput true
      }

      steps {
       withKubeConfig([credentialsId: 'kubernetes-preproduction-1-cluster', serverUrl: 'https://35.243.206.245']) {         
         sh """
            helm repo add stable https://charts.helm.sh/stable
            helm repo add incubator https://charts.helm.sh/incubator
            helm repo add kube-orchestration https://"""+ GITHUB_HELM_REPO_TOKEN +"""@raw.githubusercontent.com/cdmbase/kube-orchestration/develop
            helm repo update
         """
          script {

            nameSpaceCheck = sh(script: "kubectl get ns | tr '\\n' ','", returnStdout: true)
            if (!nameSpaceCheck.contains(params.NAMESPACE)) { sh "kubectl create ns " + params.NAMESPACE }

            def servers = getDirs(pwd() + params.DEPLOYMENT_PATH)
            def parallelStagesMap = servers.collectEntries {
             ["${it}" : generateStage(it, deployment_env)]
            }
            parallel parallelStagesMap
          }
        }
      }
    } // End of dev deployment code block.

  // if PR is from branch other than `develop` then merge to `develop` if we chose ENV_CHOICE as 'buildAndPublish'.
    stage ('Merge `develop` branch to master'){
      when {
        expression { params.ENV_CHOICE == 'allenv' || params.ENV_CHOICE == 'ProdWithBuild' || params.ENV_CHOICE == 'stageDeploy'}
      }
      steps{
        sh """
          git checkout ${params.REPOSITORY_BRANCH}
          git merge origin/develop -m 'auto merging'
          ${params.BUILD_STRATEGY} install
          ${params.BUILD_STRATEGY} run lerna
          ${params.BUILD_STRATEGY} run build
        """
        script {
          GIT_BRANCH_NAME = params.REPOSITORY_BRANCH
        }
      }
    }

  // publish packages to npm repository.
    // commit new package-lock.json that might get generated during install
    // Build will be ignore with tag '[skip ci]'
    stage ('Publish Prod packages'){
      when {
        expression { params.ENV_CHOICE == 'allenv' || params.ENV_CHOICE == 'ProdWithBuild' || params.ENV_CHOICE == 'stageDeploy'}
      }
      steps{
        script {
          GIT_BRANCH_NAME=params.PUBLISH_BRANCH
        }
        sshagent (credentials: [params.GIT_CREDENTIAL_ID]) {
          sh """
            git add -A
            git diff --staged --quiet || git commit -am 'auto build\r\n[skip ci]'
            git fetch origin master
            git checkout master
            ${params.BUILD_STRATEGY} run publish:${params.NPM_PUBLISH_STRATEGY};
            git checkout ${params.PUBLISH_BRANCH}
          """
        }
      }
    }
  
  // Build Docker containers for production.
    stage('Prod Docker Images') {
      options {
         timeout(time: params.BUILD_TIME_OUT, unit: 'MINUTES')
       }
      when {
        expression { params.ENV_CHOICE == 'allenv' || params.ENV_CHOICE == 'ProdWithBuild' || params.ENV_CHOICE == 'stageDeploy' }
      }

      // Below variable is only set to load all (variables, functions) from jenkins_variables.groovy file.
      environment{ deployment_env = 'prod' }
        steps{
          load "./jenkins_variables.groovy"
          script {
            def servers = getDirs(pwd() + params.DEPLOYMENT_PATH)
            def parallelStagesMap = servers.collectEntries {
             ["${it}" : generateBuildStage(it)]
            }
            parallel parallelStagesMap
          }
        }
    } // End of production docker build.


  // Below are stage code block
    stage('Stage deployment') {
      options {
         timeout(time: 300, unit: 'SECONDS')
       }
      environment{
      deployment_env = 'stage'
      DOMAIN_NAME = 'cdebase.io'
      }
      when {
        expression {params.ENV_CHOICE == 'stageDeploy' || params.ENV_CHOICE == 'allenv'}
        beforeInput true
      }

      steps {
        load "./jenkins_variables.groovy"
        withKubeConfig([credentialsId: 'kubernetes-dev-cluster', serverUrl: 'https://0.0.0.0']) {
          
          sh """
            helm repo add stable https://charts.helm.sh/stable
            helm repo add incubator https://charts.helm.sh/incubator
            helm repo add kube-orchestration https://"""+ GITHUB_HELM_REPO_TOKEN +"""@raw.githubusercontent.com/cdmbase/kube-orchestration/develop
            helm repo update
          """
          script {
            nameSpaceCheck = sh(script: "kubectl get ns | tr '\\n' ','", returnStdout: true)
            if (!nameSpaceCheck.contains(params.NAMESPACE)) { sh "kubectl create ns " + params.NAMESPACE }

            def servers = getDirs(pwd() + params.DEPLOYMENT_PATH)
            def parallelStagesMap = servers.collectEntries {
              ["${it}" : generateStage(it, deployment_env)]
            }
            parallel parallelStagesMap
          }
        }
      }
    } // End of staging deployment code block.



  // Below are production stages
    stage('Prod deployment') {
      options {
          timeout(time: 300, unit: 'SECONDS')
      }
      environment{
          deployment_env = 'prod'
          DOMAIN_NAME = 'cdebase.com'
      }
      when {
        expression { params.ENV_CHOICE == 'allenv' || params.ENV_CHOICE == 'prodDeploy' || params.ENV_CHOICE == 'ProdWithBuild'}
        beforeInput true
      }

      input {
        message "Want to deploy fullstack-pro on prod cluster?"
        parameters {
          choice choices: ['yes', 'no'], description: 'Want to deploy micro service on prod?', name: 'PROD_DEPLOYMENT'
        }
      }

      steps {
        load "./jenkins_variables.groovy"
        withKubeConfig([credentialsId: 'kubernetes-prod-cluster', serverUrl: 'https://104.196.165.88']) {
          sh """
             helm repo add stable https://charts.helm.sh/stable
             helm repo add incubator https://charts.helm.sh/incubator
             helm repo add kube-orchestration https://"""+ GITHUB_HELM_REPO_TOKEN +"""@raw.githubusercontent.com/cdmbase/kube-orchestration/develop
             helm repo update
           """
          script {
            nameSpaceCheck = sh(script: "kubectl get ns | tr '\\n' ','", returnStdout: true)
            if (!nameSpaceCheck.contains(params.NAMESPACE)) { sh "kubectl create ns " + params.NAMESPACE }
            
            def servers = getDirs(pwd() + params.DEPLOYMENT_PATH)
            def parallelStagesMap = servers.collectEntries {
             ["${it}" : generateStage(it, deployment_env)]
            }
            parallel parallelStagesMap
          }
       }
      }
    } // End of production deployment code block.

  }

  post {
    always {
      deleteDir()
    }
    success{
      slackSend (color: '#00FF00', message: "SUCCESSFUL:  Job  '${env.JOB_NAME}'  BUILD NUMBER:  '${env.BUILD_NUMBER}'  Job success. click <${env.RUN_DISPLAY_URL}|here> to see the log.", channel: 'idestack-automation')
    }
    failure{
      slackSend (color: '#FF0000', message: "FAILED:  Job  '${env.JOB_NAME}'  BUILD NUMBER:  '${env.BUILD_NUMBER}'  Job failed. click <${env.RUN_DISPLAY_URL}|here> to see the log.", channel: 'idestack-automation')
    }
  }
}

def getBuildCommand(){
  if(DEBUG.toBoolean()){
    return 'build:debug'
  } else {
    return 'build'
  }
}

def getGitPrBranchName() {
    // The branch name could be in the BRANCH_NAME or GIT_BRANCH variable depending on the type of job
  //def branchName = env.BRANCH_NAME ? env.BRANCH_NAME : env.GIT_BRANCH
  //return branchName || ghprbSourceBranch
  if(env.ghprbSourceBranch){
    return env.ghprbSourceBranch
  } else {
    return params.REPOSITORY_BRANCH
  }
}

def getGitBranchName(){ // we can place some conditions in future
  if(env.ghprbSourceBranch){
    return env.ghprbSourceBranch
  } else {
    return params.REPOSITORY_BRANCH
  }
}

@NonCPS
//TODO: Fix below get method for Jenkins slave if possible.
def getDirs1(path){
  def currentDir = new File(path)
  def dirs = []
  currentDir.eachDir() {
      dirs << it.name
  }
  return dirs
}

// Below function to work in Jenkins slave
def getDirs(path){
    def currentDir = sh(script: "ls -CF "+path+" | tr '/' ' '", returnStdout: true)
    def dirs = []
    (currentDir.split()).each {
      dirs << "${it}"
    }
    return dirs
}

def generateStage(server, environmentType) {
  return {
    stage("stage: ${server}") {
      echo "This is ${server}."
      def filterExist = "${server}".contains(params.EXCLUDE_SETTING_NAMESPACE_FILTER)
      def namespace = filterExist ? '' : "--namespace=${params.NAMESPACE}"
      def name = getName(pwd() + "${params.DEPLOYMENT_PATH}/${server}/package.json")
      def version = getVersion(pwd() + params.DEPLOYMENT_PATH + "/${server}/package.json")
      def valuesFile = "values-${environmentType}.yaml"
      // deploy anything matching `*backend-server` or `*frontend-server` to use idestack chart
      try{
        if ("${server}".endsWith("backend-server") | "${server}".endsWith("frontend-server")) {
          echo "add deployment flag to - ${server} "

          if ("${server}".endsWith("frontend-server")){
            deployment_flag = " --set backend.enabled='false' --set external.enabled='true' "
          }

          if ("${server}".endsWith("backend-server")){
            deployment_flag = " --set frontend.enabled='false' --set external.enabled='false' --set ingress.enabled=false "
          }

          sh """
            helm upgrade -i \
            ${UNIQUE_NAME}-${server} \
            -f "${valuesFile}" \
            ${namespace} \
            ${deployment_flag} \
            --set frontend.image="${REPOSITORY_SERVER}/${name}" \
            --set frontend.imageTag=${version} \
            --set backend.image="${REPOSITORY_SERVER}/${name}" \
            --set backend.imageTag=${version} \
            --set settings.workspaceId="${WORKSPACE_ID}" \
            --set frontend.pullPolicy=Always \
            --set backend.pullPolicy=Always \
            --set ingress.domain=${env.DOMAIN_NAME} \
            --version=${IDESTACK_CHART_VERSION} \
              kube-orchestration/idestack
            """

        } else {
          sh """
            cd .${params.DEPLOYMENT_PATH}/${server}
            helm upgrade -i \
            ${UNIQUE_NAME}-${server}-api \
            -f "charts/chart/${valuesFile}" \
            ${namespace} \
            --set image.repository=${REPOSITORY_SERVER}/${name} \
            --set image.tag=${version} \
            charts/chart
          """

        }
      } catch (Exception err) {
        slackSend (color: '#FF0000', message: "FAILED:  Job  '${env.JOB_NAME}'  BUILD NUMBER:  '${env.BUILD_NUMBER}'  Job failed in stage deployment ${server}. click <${env.RUN_DISPLAY_URL}|here> to see the log. Error: ${err.toString()}", channel: 'idestack-automation')
        println err
        throw(err)
      }
    }
  }
}

// Docker build parllel loop
def generateBuildStage(server) {
  return {
    stage("stage: ${server}") {
     try{
      echo "This is ${server}."
      def name = getName(pwd() + params.DEPLOYMENT_PATH + "/${server}/package.json")
      def version = getVersion(pwd() + params.DEPLOYMENT_PATH + "/${server}/package.json")
        sh """
            lerna exec --scope=*${server} ${params.BUILD_STRATEGY} run docker:${env.BUILD_COMMAND};
            docker tag ${name}:${version} ${REPOSITORY_SERVER}/${name}:${version}
            docker push ${REPOSITORY_SERVER}/${name}:${version}
            docker rmi ${REPOSITORY_SERVER}/${name}:${version}
        """
      } catch (e) {
        slackSend (color: '#FF0000', message: "FAILED:  Job  '${env.JOB_NAME}'  BUILD NUMBER:  '${env.BUILD_NUMBER}'  Job failed in stage docker-build ${server}. click <${env.RUN_DISPLAY_URL}|here> to see the log. Error: ${e}", channel: 'idestack-automation')
        throw(e)
      }
    }
  }
}

import groovy.json.JsonSlurper
def getVersion(json_file_path){
  def inputFile = readFile(json_file_path)
  def InputJSON = new JsonSlurper().parseText(inputFile)
  def version = InputJSON.version
return version
}

def getName(json_file_path){
  def inputFile = readFile(json_file_path)
  def InputJSON = new JsonSlurper().parseText(inputFile)
  def name = InputJSON.name
return name
}
