// hr/hr.js
module.exports = function (app) {

    class TeamMember {
        constructor(empId, name, role) {
            this.empId = empId;
            this.name = name;
            this.role = role;
        }
    }

    // Note: normall this should be separate application...this is a misuse of current app to mimic external system

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

    var getEmployeeById = function (id) {
        
        const http = require('request-promise-native');
        return http('http://localhost:8081/hr/v1/employees/' + id)
            .then(function(resp){
                console.log('response...' + resp);
                var respObj = JSON.parse(resp);

                return new TeamMember(respObj.empId, respObj.name, 'Developer');
            })
    
    }

    return {
        getEmployeeById: getEmployeeById
    }
}
