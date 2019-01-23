#!/usr/bin/env node
'use strict';

var path = require('path')
var fs = require('fs')
var fse = require('fs-extra')
var execSync = require('child_process').execSync
var exec = require('child_process').exec
var chalk = require('chalk')
var program = require('commander')

var argv = process.argv
var currentPath = process.cwd()
var projectName

process.chdir(__dirname)
var originConfigFile = './config.json'
var cachedConfigFile = './cachedConfig.json'
var config = JSON.parse(fs.readFileSync(
  fs.existsSync(cachedConfigFile) ? cachedConfigFile : originConfigFile
))
var repositoryReg = /\/(.+)\.git/
var hadUpdateRepository = false

program
  .version('0.1.0', '-v, --version')
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .option('-s, --setup-repository <repositoryUrl>', 'setup custom repository', setupRepositoryUrl)
  .option('-u, --update-repository [repositoryName]', 'update custom repository by folder name', updateRepository)
  .option('-k, --keyword-to-replace <keyword>', 'set replace keyword to repositories', setKeyword)
  .option('-l, --ls', 'list the repositories', listRepositories)
  .option('-d, --default', 'set config to default', setConfigDefault)
  .action(name => {
    projectName = name
    cloneRepositoriesFolder()
  })
  
console.log(chalk.green(`current setup repository is: ${config.setupRepository}`))
program.parse(argv)

if (program.updateRepository && !hadUpdateRepository) {
  updateRepository(config.setupRepository)
}

function initRepository() {
  var repositoryUrls = config.repositoryUrls
  if (!fs.existsSync('../repositories')) {
    fs.mkdirSync('../repositories')
  }
  if (repositoryUrls) {
    repositoryUrls.forEach(repositoryUrl => {
      var repositoryName = repositoryUrl.match(repositoryReg)[1]
      if (repositoryName) {
        var isExist = fs.existsSync(`../repositories/${repositoryName}`)
        if (isExist) {
          console.log(`repository: ${repositoryName} is existed.`)
          fse.emptyDirSync(`../repositories/${repositoryName}`)
        } else {
          console.log(chalk.red(`repository: ${repositoryName} dosen't exist`))
        }
        execSync(`cd ../repositories && git clone ${repositoryUrl}`)
      }
    })
  }
}

function cloneRepositoriesFolder() {
  if (projectName) {
    var repositoryDir = `../repositories/${config.setupRepository}`
    var ouputDir =  path.join(currentPath, projectName)
    if (fs.existsSync(repositoryDir)) {
      fse.copySync(repositoryDir, ouputDir)
      execSync(`rm -rf ${ouputDir}/.git`)
      replaceFolderKeyword(ouputDir)
    }
  }
}

function replaceFolderKeyword(originDir) {
  var files = fs.readdirSync(originDir)
  var reg = new RegExp(config.setupRepository, 'g')
  files.forEach(fileOrDir => {
    var currFile = path.join(originDir, fileOrDir)
    var isDirectory = fs.lstatSync(currFile).isDirectory()
    var newFile
    if (fileOrDir.includes(config.replaceKeyword)) {
      newFile = currFile.replace(reg, projectName)
      fs.renameSync(currFile, newFile)
    }
    if (isDirectory) {
      replaceFolderKeyword(newFile || currFile)
    } else {
      var content = fs.readFileSync(newFile || currFile).toString()
      if (content.includes(config.replaceKeyword)) {
        content = content.replace(reg, projectName)
        fs.writeFileSync(newFile || currFile, content, 'utf-8')
      }
    }
  })
}

function setupRepositoryUrl(repositoryUrlOrName) {
  var repositoryName
  var isGitUrl = repositoryReg.test(repositoryUrlOrName)
  if (isGitUrl) {
    repositoryName = repositoryUrlOrName.match(repositoryReg)[1]
    if (repositoryName) {
      if (fs.existsSync(`../repositories/${repositoryName}`)) {
        execSync('../repositories && git pull')
      } else {
        execSync(`cd ../repositories && git clone ${repositoryUrlOrName}`)
      }
    }
  } else {
    config.repositoryUrls.forEach(repositoryUrl => {
      var name = repositoryUrl.match(repositoryReg)[1]
      if (name === repositoryUrlOrName) {
        repositoryName = repositoryUrlOrName
      }
    })
  }
  if (repositoryName) {
    config.setupRepository = repositoryName
    if (isGitUrl && !config.repositoryUrls.includes(repositoryUrlOrName)) {
      config.repositoryUrls.push(repositoryUrlOrName)
    }
    console.log(chalk.green(`setup repositoryName: ${repositoryName}`))
    writeConfigFile()
  }
  initRepository()
}

function updateRepository(repositoryName) {
  hadUpdateRepository = true
  if (fs.existsSync(`../repositories/${repositoryName}`)) {
    console.log(chalk.green(`updating repository: ${repositoryName}`))
    execSync(`cd ../repositories/${repositoryName} && git pull`)
  } else {
    console.log(chalk.red(`repository: ${repositoryName} doesn't exist`))
    if (config.repositoryUrls.some(repositoryUrl => repositoryUrl.includes(repositoryName))) {
      execSync(`cd ../repositories && git clone ${repositoryUrl}`)
    }
  }
}

function setKeyword(keyword) {
  config.replaceKeyword = keyword
  writeConfigFile()
  console.log(chalk.green(`set keyword: ${keyword}`))
}

function listRepositories() {
  console.log(chalk.green(`repositoryUrls is:\n${JSON.stringify(config.repositoryUrls, null, 2)}`))
}

function setConfigDefault() {
  config = JSON.parse(fs.readFileSync(originConfigFile))
  if (fs.existsSync(cachedConfigFile)) {
    fs.unlinkSync(cachedConfigFile)
  }
  console.log(chalk.green('config is reset.'))
}

function writeConfigFile() {
  fs.writeFileSync(`${cachedConfigFile}`, JSON.stringify(config, null, 2))
}