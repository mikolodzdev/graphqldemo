// projects/projects.js
class Project {
    constructor(id, name, time, hourRate, teammemberIds){
        this.id = id;
        this.name = name;
        this.time = time;
        this.hourRate = hourRate;
        this.teammemberIds = teammemberIds;
    }
}

var mapToListElem = function(id) { return {"N": id.toString()} }
var mapElemToList = function(elem) { return parseInt(elem.N)}

// Initialising DynamoDB
const PROJECTS_DB = [ new Project(1, 'Death Star', 100, 150, [1,2,4]),
new Project(2, 'X-Wing Fighter', 1000, 100, [1,3]),
new Project(3, 'Falcon Millenium', 750, 250, [3])];

console.log('initialise DynamoDB...');
var AWS = require("aws-sdk");
AWS.config.loadFromPath('./credentials.json');

// needed for localhost
// dyn= new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });

dyn= new AWS.DynamoDB();

var params = {
TableName : "Projects",
KeySchema: [       
    { AttributeName: "id", KeyType: "HASH"}
],
AttributeDefinitions: [
    { AttributeName: "id", AttributeType: "S" }
],
ProvisionedThroughput: {       
    ReadCapacityUnits: 5, 
    WriteCapacityUnits: 5
    }
};

dyn.listTables(function (err, data) {
    console.log('listTables: ', err , data);
    if(data.TableNames.length > 0 && data.TableNames[0] === "Projects") {
        console.log("Table Projects exists. Initialisation skipped.");
    } else {
        console.log("Creating table Projects...");

        dyn.createTable(params, function(err, data) {
            if (err) 
                console.log("createTable ERR: " + err, err.stack); // an error occurred
            else {
                console.log("Table Projects created.");
                console.log("Initialising table Projects...");

                PROJECTS_DB.forEach(function(p, i) {
                    var itemToPut =  {
                        id: {"S": i.toString()},
                        name: {"S": p.name},
                        time: {"N": p.time.toString()},
                        hourRate:{"N": p.hourRate.toString()},
                        teammemberIds: {
                            "L": p.teammemberIds.map(mapToListElem)}
                    };

                    dyn.putItem({
                        TableName: "Projects",
                        Item: itemToPut
                    }, function(err, data) {
                            var msg = err ? err : JSON.stringify(itemToPut);
                            console.log("putItem: " + msg);
                        }); 
                    });
                
                }
        });
    }
});


module.exports = function(app){
    console.log("initialising module projects...");

    var getProjectById = function (projectId) {
        var promise = new Promise(function (resolve, reject) {
            var params = {
                TableName: "Projects",
                Key: {
                    id: {
                        S: projectId.toString()
                    }
                },
                ConsistentRead: false, // optional (true | false)
                ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
            };
    
            dyn.getItem(params, function (err, { Item }) {
                if (err) {
                    reject(Error("It broke"));
                } else {
                    console.log("R2 " + Item); // successful response
                    resolve(new Project(Item.id.S, Item.name.S, parseInt(Item.time.N), parseInt(Item.hourRate.N), Item.teammemberIds.L.map(mapElemToList)));
                }
            });
    
        });
    
        return promise;
    }

    var getProjectByName = function (projectName) {
        var promise = new Promise(function (resolve, reject) {
            var params = {
                TableName: "Projects"
            };
    
            dyn.scan(params, function (err, {Items}) {
                if (err) {
                    reject(Error("It broke"));
                } else {
                    Items.forEach(function(i) {
                        if(i.name.S === projectName) {
                            resolve(new Project(i.id.S, i.name.S, i.time.N, i.hourRate.N, i.teammemberIds.L.map(mapElemToList)));
                        }
                    })
                    reject("Not Found");
                }
            });
    
        });
    
        return promise;
    }

    var setProjectHourRate = function(projectId, newHRate) {
        var promise = getProjectById(projectId)
            .then(function(p) {
                p.hourRate = newHRate;

                var itemToPut =  {
                    id: {"S": p.id},
                    name: {"S": p.name},
                    time: {"N": p.time.toString()},
                    hourRate:{"N": p.hourRate.toString()},
                    teammemberIds: {
                        "L": p.teammemberIds.map(mapToListElem)}
                };

                dyn.putItem({
                    TableName: "Projects",
                    Item: itemToPut
                }, function(err, data) {
                        var msg = err ? err : JSON.stringify(itemToPut);
                        console.log("putItem: " + msg);
                    }); 
                });
    
        return promise;
    }

    // API
    return {
        getProjectById: getProjectById,
        getProjectByName: getProjectByName,
        setProjectHourRate: setProjectHourRate
    }
}
    