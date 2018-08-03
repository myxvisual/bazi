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
var chachedConfigFile = './cachedConfig.json'
var config = JSON.parse(fs.readFileSync(
  fs.existsSync(chachedConfigFile) ? chachedConfigFile : originConfigFile
))
var repositoryReg = /\/(.+)\.git/

program
  .version('0.1.0', '-v, --version')
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .option('-s, --setup-repository <repositoryUrl>', 'setup custom repository', setupRepositoryUrl)
  .option('-u, --update-repository <repositoryName>', 'update custom repository by folder name', updateRepository)
  .option('-k, --keyword-to-replace <keyword>', 'set replace keyword to repositorys', setKeyword)
  .option('-l, --ls', 'list the repositories', listRepositorys)
  .option('-d, --default', 'set config to default', setConfigDefault)
  .action(name => {
    projectName = name
    init()
    cloneRepositroyFolder()
  })
  
console.log(chalk.green(`current setup repository is: ${config.setupRepository}`))
program.parse(argv)

function init() {
  var repositoryUrls = config.repositoryUrls
  if (repositoryUrls) {
    repositoryUrls.forEach(repositoryUrl => {
      var repositoryName = repositoryUrl.match(repositoryReg)[1]
      if (repositoryName) {
        var isExist = fs.existsSync(`../repositorys/${repositoryName}`)
        if (isExist) {
          // console.log(`repository: ${repositoryName} is existed.`)
        } else {
          console.log(chalk.red(`repository: ${repositoryName} dosen't exist`))
          console.log(chalk.green(`clone repository ${repositoryName}...` ))
          execSync(`cd ../repositorys && git clone ${repositoryUrl}`)
        }
      }
    })
  }
}

function cloneRepositroyFolder() {
  if (projectName) {
    var repositoryDir = `../repositorys/${config.setupRepository}`
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
      if (fs.existsSync(`../repositorys/${repositoryName}`)) {
        execSync('../repositorys && git pull')
      } else {
        execSync(`cd ../repositorys && git clone ${repositoryUrlOrName}`)
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
    writeCachedConfigfile()
  }
}

function updateRepository(repositoryName) {
  if (fs.existsSync(`../repositorys/${repositoryName}`)) {
    execSync(`cd ../repositorys/${repositoryName} && git pull`)
  } else {
    console.log(chalk.red(`repository: ${repositoryName} dosen't exist`))
    if (config.repositoryUrls.some(repositoryUrl => repositoryUrl.includes(repositoryName))) {
      execSync(`cd ../repositorys && git clone ${repositoryUrl}`)
    }
  }
}

function setKeyword(keyword) {
  config.replaceKeyword = keyword
  writeCachedConfigfile()
  console.log(chalk.green(`set keyword: ${keyword}`))
}

function listRepositorys() {
  console.log(chalk.green(`repositoryUrls is:\n${JSON.stringify(config.repositoryUrls, null, 2)}`))
}

function setConfigDefault() {
  config = JSON.parse(fs.readFileSync(originConfigFile))
  if (fs.existsSync(chachedConfigFile)) {
    fs.unlinkSync(chachedConfigFile)
  }
  console.log(chalk.green('config is reseted.'))
}

function writeCachedConfigfile() {
  fs.writeFileSync(`${chachedConfigFile}`, JSON.stringify(config, null, 2))
}