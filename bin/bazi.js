var path = require('path')
var fs = require('fs')
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
  .option('-s, --setup-repository <repositoryUrl>', 'setup custom repository', setupRepository)
  .option('-u, --update-repository <repositoryName>', 'update custom repository by folder name', updateRepository)
  .option('-r, --replace-keyword <replaceKeyword>', 'set replace keyword to template', setReplaceKeyword)
  .option('-l, --ls', 'list the repositories', listTemplate)
  .option('-d, --default', 'set config to default', setConfigDefault)
  .action(name => {
    projectName = name
    console.log(name)
    init()
  })

program.parse(argv)

function init() {
  var repositoryUrls = config.repositoryUrls
  if (repositoryUrls) {
    repositoryUrls.forEach(repositoryUrl => {
      var repositoryName = repositoryUrl.match(repositoryReg)[1]
      if (repositoryName) {
        var isExist = fs.existsSync(`../template/${repositoryName}`)
        if (isExist) {
          // console.log(`repository: ${repositoryName} is existed.`)
        } else {
          console.log(chalk.red(`repository: ${repositoryName} dosen't exist`))
          console.log(chalk.green(`clone repository ${repositoryName}...` ))
          execSync(`cd ../template && git clone ${repositoryUrl}`)
        }
      }
    })
  }
}

function setupRepository(repositoryUrl) {
  execSync(`cd ../template && git clone ${repositoryUrl}`)
}

function updateRepository(repositoryName) {
  if (fs.existsSync(`../template/${repositoryName}`)) {
    execSync(`cd ../template/${repositoryName} && git pull`)
  } else {
    console.log(chalk.red(`repository: ${repositoryName} dosen't exist`))
    if (config.repositoryUrls.some(repositoryUrl => repositoryUrl.includes(repositoryName))) {
      execSync(`cd ../template && git clone ${repositoryUrl}`)
    }
  }
}

function setReplaceKeyword(replaceKeyword) {
  config.replaceKeyword = replaceKeyword
  writeCachedConfigfile()
  console.log(chalk.green(`set replaceKeyword: ${replaceKeyword}`))
}

function listTemplate() {
  console.log(chalk.green(`repositoryUrls is:\n${config.repositoryUrls}`))
}

function setConfigDefault() {
  config = JSON.parse(fs.readFileSync(originConfigFile))
  if (fs.existsSync(chachedConfigFile)) {
    fs.unlinkSync(chachedConfigFile)
  }
  console.log(chalk.green('config is reseted.'))
}

function writeCachedConfigfile() {
  fs.writeFileSync(`./${chachedConfigFile}`, JSON.stringify(config, null, 2))
}