var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://admin:password@localhost:27017/";

console.log('hello world')

const main = async () => {
  try{
    const client = await MongoClient.connect(url)
    const collection = client.db("IdenFace").collection("IdenFace")
    const res = await collection.insertOne({content: "Test data"})

    console.log('test response is ', res)

    console.log('Connected to MongoDB')
  }catch( err ) {
    throw err
  }
}

main()
