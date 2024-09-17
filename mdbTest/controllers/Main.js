/*
    This is the router for mongodb Logic using Mongodb Atlas and mongoose API - This use the cloud server.
*/



const mainRouter = require('express').Router()
const { stringify } = require('querystring')
require('express-async-errors')
// const IdenFace = require('../models/IdenFace')
const UnknownFace = require('../models/UnknownFace')
const serverVariables = require('../serverVariables')
const axios = require('axios')
const {randomUUID} = require('crypto')
const MongoClient = require('mongodb').MongoClient
const mongodbUrl = "mongodb://admin:password@localhost:27017/"

let mongoClient

// const IdenFace = serverVariables.mongoClient.db("IdenFace").collection("IdenFace")


const connectMongo = async () => {
    try{
        mongoClient = await MongoClient.connect( mongodbUrl )
        // serverVariables.idenCollection = serverVariables.mongoClient.db('IdenFace').collection('IdenFace')
    }catch( err ) {
        throw err
    }
}


connectMongo().then(() => {
    
    console.log('Connected to mongodb server *')
}).catch( err => {
    console.log(`Error: ${err}`)
    return
})

mainRouter.post('', async(req, res) => {
    // if( !serverVariables.role || !serverVariables.slaves || serverVariables.slaves.isEmpty()){
    //     res.status(400).send('server is not ready or unavailable')
    // }

    const body = req.body

    if( !body.receivedAt ){
        body.receivedAt = Date.now()
    }
    
    if ( serverVariables.role === 'master' ){
        const newTrackID = randomUUID().toString()
        console.log('mongo client is ', mongoClient)
        const savedData = await mongoClient.db("IdenFace").collection("IdenFace").insertOne({
            Name: body.Name,
            FacesVector: body.FacesVector,
            Atribute: body.Atribute,
            Array: body.Array,
            Track_ID: newTrackID
        })

        const masterReceived = Date.now()

        await broadcastToSlaves({...body, Track_ID: newTrackID} )

        const sTime = Date.now()
        await mongoClient.db("IdenFace").collection("IdenFace").find({Track_ID: newTrackID})
        const getTime = Date.now() - sTime

        res.status(200).send({...body, Track_ID: newTrackID, masterReceived: masterReceived, getTime: getTime })

    }else{
        if( body.from && body.from === 'master'){

            const savedData = await mongoClient.db("IdenFace").collection("IdenFace").insertOne({
                Name: body.Name,
                Track_ID: body.Track_ID,
                FacesVector: body.FacesVector,
                Atribute: body.Atribute,
                Array: body.Array
            })
            res.status(200).send(savedData)
        }else{
            const resData = await axios.post(`${serverVariables.master}`, body)
            res.status(200).json(resData)
        }
    }
})

const broadcastToSlaves = async (dat) => {
    const data = dat
    console.log(dat)
    // const currentTime = Date.now()
    const jsonData = {...data, from: 'master'}
    if (!jsonData.receivedAt) {
        jsonData.receivedAt = Date.now()
    }
    for( let slave of serverVariables.slaves ){
        await axios.post(`http://${slave}`, jsonData)
    }
}

module.exports = mainRouter