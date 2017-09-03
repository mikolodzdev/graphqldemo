var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');

const http = require('request-promise-native');

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
            promises.push(http('http://localhost:4000/hr/v1/employees/' + id)
                .then(function(resp){
                    console.log('response...' + resp);
                    var respObj = JSON.parse(resp);

                    return new TeamMember(respObj.empId, respObj.name, 'Developer');
                })
            );
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

// pseudo DB
const PROJECTS_DB = [ new Project(1, 'Death Star', 100, 150, [1,2,4]),
        new Project(2, 'X-Wing Fighter', 1000, 100, [1,3]),
        new Project(3, 'Falcon Millenium', 750, 250, [3])];

// The root provides a resolver function for each API endpoint
var root = {
    getProject({id}) {
        return PROJECTS_DB.find((p) => {
            return p.id === id;
        });
    },
    getTeammembers({projectName}) {
        var p = PROJECTS_DB.find((p) => {
            return p.name === projectName;
        });
        return p.teammembers();
    },
    setProjectHourRate({projectId, newHRate}) {
        var p = PROJECTS_DB.find((p) => {
            return p.id === projectId;
        });

        p.hourRate = newHRate;
        return p;
    }
};

var app = express();
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));



// pseudo DB
const EMPLOYEES_DB = ["Darth Vader", "Luc Skywalker", "Master Yoda", "Han Solo", "Princess Leia"];

// additional endpoint
app.use('/hr/v1/employees/:empId', ({params}, res) => {
    console.log('request for employee nr ' + params.empId)
    res.send({
        empId: params.empId,
        name: EMPLOYEES_DB[params.empId],
        mail: EMPLOYEES_DB[params.empId].replace(/\s/g, '') + '@zuehlke.com'        
    });
});

app.listen(8081);
console.log('Running a GraphQL API server at localhost:8081/graphql');


console.log('initialise DynamoDB');
var AWS = require("aws-sdk");
AWS.config.loadFromPath('./credentials.json');
dyn= new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });

var params = {
        TableName : "Projects",
        KeySchema: [       
            { AttributeName: "id", KeyType: "HASH"}
        ],
        AttributeDefinitions: [       
            { AttributeName: "id", AttributeType: "N" }
        ],
        ProvisionedThroughput: {       
            ReadCapacityUnits: 5, 
            WriteCapacityUnits: 5
           }
        };
 
dyn.createTable(params, function(e) {
        console.error(e);
    });

dyn.listTables(function (err, data)
{
   console.log('listTables',err,data);
});

dyn.putItem({
    TableName: "Projects",
    Item: {
        "id": {"N": "1"},
        "name": {"S": "Project name"},
        "time": {"N": "100"},
        "hourRate":{"N": "150"},
        "teammemberIds": {"L": [{"N":"1"}, {"N":"2"}, {"N":"4"}]}
    }
}, function(err, data) {
    console.log("P" + err + data);
    console.log(JSON.stringify(data));
});

var params2 = {
            TableName: "Projects",
            KeyConditionExpression: "#id = :id",
            ExpressionAttributeNames:{
                "#id": "id"
            },
            ExpressionAttributeValues: {
                ":id":1
            }
        };

var docClient = new AWS.DynamoDB.DocumentClient();
docClient.query(params2,function(err, data) {
    console.log("R" + data);
});


var params3 = {
    TableName: 'Projects',
    Key: { // a map of attribute name to AttributeValue for all primary key attributes
    
        attribute_name: { S: 'id' }
        // more attributes...

    },
    AttributesToGet: [ // optional (list of specific attribute names to return)
        'id'
        // ... more attribute names ...
    ],
    ConsistentRead: false, // optional (true | false)
    ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
};
dyn.getItem(params3, function(err, data) {
    if (err) console.log("E" + err); // an error occurred
    else console.log("R2 " + data); // successful response
});