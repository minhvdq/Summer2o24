const express = require('express');
require('dotenv').config()
require('express-async-errors')
const app = express();
const axios = require('axios')
const bodyParser = require('body-parser')
const serverVariables = require('./serverVariables')
const mongoose = require('mongoose')
const MongoClient = require('mongodb').MongoClient
const IdenFace = require('./models/IdenFace')
const UnknownFace = require('./models/UnknownFace')
const middlewares = require('./utils/middlewares')

const faceRouter = require('./controllers/Face');
const mainRouter = require('./controllers/Main_3');
const zkClient = require('./cluster/zooFunc_2')

const PORT = process.argv[2] || 3000;
serverVariables.port = PORT
const tableName = process.argv[3]
const mongodbPass = process.env.MONGODB_PASS

console.log('table name is ', tableName)
console.log('password is: ', mongodbPass)



const mongodbUrl = "mongodb://admin:password@localhost:27017/"

console.log(`running server on port ${PORT} as a ${serverVariables.role}`)
console.log(`connecting to MongoDB`)

// mongoose.set('strictQuery', false)

// mongoose.connect(mongodbUrl).then(result => {
//     console.log(`connected to MongoDB`, mongodbUrl)
// }).catch(error => console.log(error.message))

// const connectMongo = async () => {
//     try{
//         serverVariables.mongoClient = await MongoClient.connect( mongodbUrl )
//         serverVariables.idenCollection = serverVariables.mongoClient.db('IdenFace').collection('IdenFace')
//     }catch( err ) {
//         throw err
//     }
// }

// connectMongo().then(() => {
//     console.log('Connected to mongodb server')
// }).catch( err => {
//     console.log(`Error: ${err}`)
//     return
// })


zkClient.connect()

app.use(express.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(middlewares.requestLogger)
app.use(middlewares.tokenExtractor)

app.use('/face', faceRouter )

app.get( '/status', (req, res) => {
    res.status(200).send(`server is runnig stably on port ${serverVariables.port} as a ${serverVariables.role}`)
})

app.post( '/connect', async( req, res ) => {
    const reqPort = req.socket.remotePort
    const reqAddress = req.socket.remoteAddress

    const port = req.body.port
    const address = req.body.address

    // const ipAddress = req.ip
    //console.log(`the request: ${JSON.stringify(req)}`)

    // console.log(`ip address is ${ipAddress}`)

    const reqUrl = `http://localhost:${port}`

    serverVariables.slaves.push(reqUrl)

    console.log(`current slaves contain ${serverVariables.slaves}`)

    res.status(200).send(`${reqUrl} saved`)
})

app.get('/connect', (req, res) => {
    res.status(200).json(serverVariables.slaves)
})

app.get('/role', (req, res) => {
    res.status(200).send(serverVariables.role)
})

app.get('/master', (req, res) => {
    res.status(200).send(serverVariables.master)
})

app.use( '/', mainRouter)

app.post( '/clearall', async( req, res ) => {
    await IdenFace.deleteMany({})
    await UnknownFace.deleteMany({})
    res.status(200).send("successfully delete everything in table")
})

app.use(middlewares.unknownEndpoint)
app.use(middlewares.errorHandler)

let server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});