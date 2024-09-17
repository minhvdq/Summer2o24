const express = require('express');
require('dotenv').config()
const app = express();
const axios = require('axios')
const cors  = require('cors')
const fs = require('fs')
const createCsvWriter = require('csv-writer').createArrayCsvWriter
const csvPath = './resource/data.csv'

const PORT = 2000
const TEST_SIZE = 100

app.use(express.json())
app.use(cors)


const randomNumber = (a) => {
    return Math.floor(Math.random() * (a + 1))
}


const createDummiData = () => {
    const random = randomNumber(1)
    const randomNum = randomNumber(1000)
    let randArr = []
    for( let i = 0; i < 26000; i ++ ){
        randArr.push(randomNumber(1000))
    }
    let dummyData = {
        Name: `name ${randomNum}`,
        Atribute: `Atribute ${randomNum}`,
        Array: randArr
    } 

    dummyData.FacesVector = `face ${randomNum}`




    // dummyData.TrackID = randomUUID()

    return dummyData
}



const postTest = async () => {
    const masterUrl = `http://localhost:3000/`
    const dummiData = createDummiData()
    return await axios.post(masterUrl, dummiData)
}

const tableOut = []

const main = async () => {

    let totalLat1 = 0
    let totalLat2 = 0
    let totalLat3 = 0
    let totalSize = 0

    for( let i = 0; i < TEST_SIZE; i ++ ){
        const resData = await postTest()
        const data = resData.data
        const current = Date.now()

        const size = Buffer.byteLength(JSON.stringify(data))

        const latency1 = data.masterReceived - data.receivedAt
        const latency2 = current - data.masterReceived

        const latency3 = data.getTime
        totalLat1 += latency1
        totalLat2 += latency2
        totalLat3 += latency3
        totalSize += size

        tableOut.push([i, latency1, latency2, latency3, size])
    }

    tableOut.push(["avg", totalLat1/TEST_SIZE, totalLat2/TEST_SIZE, totalLat3/TEST_SIZE, totalSize/TEST_SIZE])

    const csvWriter = createCsvWriter({
        path: csvPath,
        header: ['Index', 'Post Latency', 'Broadcast latency', 'Get Latency', 'Data Size'] // Header for csv output file
    })
    await csvWriter.writeRecords(tableOut);
    console.log('CSV file was written successfully');

    console.log(tableOut)
}

main()

let server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});