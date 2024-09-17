/*
    This is the router for mongodb Logic using local MongoDB server - This use the local server running in Docker ( the yml file attached belows ).
*/

const mainRouter = require('express').Router()
const { stringify } = require('querystring')
require('express-async-errors')
const UnknownFace = require('../models/UnknownFace')
const serverVariables = require('../serverVariables')
const axios = require('axios')
const {randomUUID} = require('crypto')
const MongoClient = require('mongodb').MongoClient
const mongodbUrl = "mongodb://admin:password@localhost:27017/"

let mongoClient

const connectMongo = async () => {
    try{
        mongoClient = await MongoClient.connect( mongodbUrl )
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
    const body = req.body

    if( !body.receivedAt ){
        body.receivedAt = Date.now()
    }

    // Pretend to be processing for 10 seconds
    console.log("Start processing data...")
    await setTimeout(() => {}, 10000)
    console.log("Done processing data!")

    // Attach new Track ID into data
    let newTrackID = randomUUID()

    // Save into local Database
    await mongoClient.db("IdenFace").collection("IdenFace").insertOne({
        Name: body.Name,
        Track_ID: newTrackID,
        FacesVector: body.FacesVector,
        Attribute: body.Attribute,
        Array: body.Array
    })
    
    // Response with appropriate code
    res.status(200).send(newTrackID)
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