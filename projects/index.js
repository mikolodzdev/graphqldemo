// projects/index.js
var projects = require('./projects')

module.exports = {  
    init: projects,
    getProjectById: projects.getProjectById,
    getProjectByName: projects.getProjectByName
}