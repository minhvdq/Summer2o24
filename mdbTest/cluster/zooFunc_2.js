const zookeeper = require('node-zookeeper-client')
const serverVariables = require('../serverVariables')
const serviceRegistry = require('./serviceRegistry')
const Iden = require('../models/IdenFace')
const Unknown = require('../models/UnknownFace')
const axios = require('axios')


const client = zookeeper.createClient('localhost:2181', {sessionTimeout: 1000})
const electionPath = '/dbelection'

async function checkLeader() {
    client.getChildren(electionPath, (event) => {
        if( event.getType() === zookeeper.Event.NODE_CHILDREN_CHANGED ){
            console.log( 'some node down, re electing leader')
            checkLeader()
        }
    },(error, children, stat) => {
        if (error) {
            console.error('Failed to list children:', error);
            return;
        }

        children.sort();
        const smallestChild = children[0];

        if (currentNodePath.endsWith(smallestChild)) {
            console.log('I am the leader');
            serverVariables.slaves = []
            for( let i = 1; i < children.length; i ++ ){
                let nodePath = `${electionPath}/${children[i]}`
                client.getData( nodePath, function( error, data, stat) {
                    if( error){
                        console.log(error)
                        return
                    }

                    const childUrl = data.toString()
                    serverVariables.slaves.push(childUrl)
                    if( i === children.length - 1){
                        console.log('slaves: ', serverVariables.slaves)
                    }
                })
            }
            serverVariables.role = 'master'
            // serviceRegistry.unregisterFromCluster(client)
            // serviceRegistry.registerToUpdate(client)
            
        } else {
            console.log(`I am a follower, leader is ${smallestChild}`);
            let leaderPath = `${electionPath}/${smallestChild}`
            client.getData( leaderPath, function( error, data, stat ) {
                if( error ) {
                    console.log( error )
                    return
                }

                const leaderUrl = data.toString()

                serverVariables.master = leaderUrl

                console.log('leader url is ', leaderUrl)
                
                
            })
            const index = children.indexOf(currentNodePath.split('/').pop());
            // if (index > 0) {
            //     const predecessor = `${electionPath}/${children[index - 1]}`;
            //     watchPredecessor(predecessor);
            // }
            console.log('registered to slave')
            serverVariables.role = 'slave'
            // serviceRegistry.registerToCluster(client, `localhost:${serverVariables.port}`)
        }
    });
}

function electLeader(  ) {
    const nodePath = `${electionPath}/candidate-`;
    client.create(nodePath, Buffer.from(`${serverVariables.ip}:${serverVariables.port}`), zookeeper.CreateMode.EPHEMERAL_SEQUENTIAL, (error, path) => {
        if (error) {
            console.error('Failed to create znode:', error);
            return;
        }
        serverVariables.currentElectNode = path
        currentNodePath = path;
        console.log('Created znode:', path);
        checkLeader();
    });
}

client.once('connected', () => {
    console.log('Connected to ZooKeeper');
    client.exists(electionPath, (error, stat) => {
        if (error) {
            console.error('Failed to check existence of election node:', error);
            return;
        }
        if (stat) {
            electLeader()
        } else {
            client.create(electionPath, (error) => {
                if (error && error.getCode() !== zookeeper.Exception.NODE_EXISTS) {
                    console.error('Failed to create election node:', error);
                    return;
                }

                electLeader()
            })
        }
    })
    serviceRegistry.createRegistryNode(client)
});

//serviceRegistry.createRegistryNode()


module.exports = client