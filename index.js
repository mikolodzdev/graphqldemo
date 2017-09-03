var express = require('express');
var app = express();
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');

var hr = require('./hr').init(app);
var projects = require('./projects').init(app);


// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
    type Query {
        getProject(id: Int!): Project
        getTeammembers(projectName: String): [TeamMember]
    }

    type Mutation {
        setProjectHourRate(projectId: Int, newHRate: Float): Project
    }

    type Project {
        id: Int
        name: String
        time: Int
        hourRate: Float
        cost: Float
        teammembers: [TeamMember]
    }

    type TeamMember {
        empId: Int!
        name: String
        role: String
        projects: [Project]
    }
`);

class Project {
    constructor(id, name, time, hourRate, teammemberIds){
        this.id = id;
        this.name = name;
        this.time = time;
        this.hourRate = hourRate;
        this.teammemberIds = teammemberIds;
    }

    // resolve functions...
    cost() {
        return this.hourRate * this.time * 8.2;
    }
    teammembers() {
        var promises = [];
        this.teammemberIds.forEach((id) => {
            promises.push(hr.getEmployeeById(id));
        })
        
        return Promise.all(promises)
            .then(function(allPromises) {
                return allPromises;
            });
    }
}

class TeamMember {
    constructor(empId, name, role) {
        this.empId = empId;
        this.name = name;
        this.role = role;
    }

    // resolve functions...
    // none
}

// The root provides a resolver function for each API endpoint
var root = {
    getProject({id}) {
        var extProjectPromise = projects.getProjectById(id)
            .then(function(data) {
                return new Project(data.id, data.name, data.time, data.hourRate, data.teammemberIds);
            });

        return extProjectPromise;
    },
    getTeammembers({projectName}) {
        var extProjectPromise = projects.getProjectByName(projectName)
            .then(function(data) {
                var p = new Project(data.id, data.name, data.time, data.hourRate, data.teammemberIds);
                return p.teammembers();
            });

        return extProjectPromise;
    },
    setProjectHourRate({projectId, newHRate}) {
        return projects.setProjectHourRate(projectId, newHRate);
    }
};


app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));

app.listen(8081);
console.log('Running a GraphQL API server at localhost:8081/graphql');