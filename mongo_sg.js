'use strict';

// const { assert } = require('console');
const express = require('express');
const fs = require('fs');
const moment = require('moment');
const assert = require('assert');
const { fn } = require('moment');
// const { PassThrough } = require('stream');
const { sort } = require('mathjs');
const uuid = require('uuid');
const { AsyncResource } = require('async_hooks');
const {MongoClient, ObjectId} = require('mongodb');
const {exit} = require('process');

const PORT = 3000;
const MONGO_DATA_PATH = `./config/mongo.json`;

const app = express();



// app.set('view engine', 'ejs')

class Player {
    constructor(fname, lname, handed, is_active, balance_usd) {
        this.fname = fname; this.lname = lname; this.handed = handed;
        this.is_active = is_active; this.balance_usd = balance_usd;
    }
}

class MongoDB {
    constructor(){
      this.MongoDb = null;
      this.players = null;
      this.ObjectId = require('mongodb').ObjectId;

      this.id = 0;
      this.my_error = new Error('information cracked!');
      this.error_2 = new Error('does not exist!');

      this.connect_mongo().catch((err) => {
        console.dir(err);
        exit(5);
      });
    }
    
    read_json(){
      try{
        let data = fs.readFileSync(MONGO_DATA_PATH,'utf8');
        let json_file = JSON.parse(data);
        // json_file = MONGO_HOST;
        return json_file;
      } catch(err){
        // throw err;
        console.dir(err);
        exit(2);
      }
      
    }
  
    async connect_mongo(){
        let mongo_json = this.read_json();
        const uri = `mongodb://${mongo_json.host}:${mongo_json.port}?useUnifiedTopology=true`;

        // const MONGO_DB = `${mongo_json.db}`;
        // console.log(`Time til connect: ${new Date()-StartAt}`);

        const client = new MongoClient(uri);
        await client.connect();
        console.log("client connected successfully! ");


        this.MongoDb = client.db(mongo_json.db);
        this.coll = this.MongoDb.collection('player');
        this.players = await this.coll.find({}).toArray();
        app.listen(PORT);
        console.log(`Server started, port ${PORT}`);
    }

    async create() {
        if (!fs.existsSync(MONGO_DATA_PATH)) {
            const obj = {
                host: "localhost", 
                port: "27017", 
                db: "ee547_hw", 
                opts: {
                    useUnifiedTopology: true
                }
            };
            const json_file = JSON.stringify(obj);
            fs.writeFileSync(MONGO_DATA_PATH, json_file);
            this.players = [];
            // this.id = 0;
        } else {
            // this.content = JSON.parse(fs.readFileSync(this.path));
            this.players = await this.MongoDb.collection('player').find({}).toArray();
            // for (let ply of this.players) {
            //     this.id = Math.max(this.id, Number(ply._id.toString()));
            // }
        }
     
    }

    checkValid(attribute, value) {
        switch (attribute) {
            // case 'pid':
            //     if (!(Number.isInteger(value)))
            //         throw this.my_error;
            //     return value;
            
            case 'fname':
                if (!(typeof value === 'string') || !(value.match(/^[A-Za-z]+$/)))
                    throw this.my_error;
                return value;

            case 'lname':
                if (value === null || value === undefined)
                    return '';
                if (!(typeof value === 'string') || !(value.match(/^[A-Za-z]*$/)))
                    throw this.my_error;
                return value;

            case 'handed':
                if (!(typeof value === 'string'))
                    throw this.my_error
                value = value.toLowerCase();
                if (!(value === 'left' || value === 'right' || value === 'ambi'))
                    throw this.my_error;
                if (value === 'left')
                    return 'L';
                else if (value === 'right')
                    return 'R';
                else
                    return 'Ambi';

            case 'is_active':
                if (value === undefined || value === null)
                    throw this.my_error;
                else if (typeof value === 'string') {
                    const s = value.toLowerCase();
                    if (s === 't' || s === 'true' || s === '1') {
                        return true;
                    }
                    else 
                        return false;
                } else {
                    if (value === true || value === 1) {
                        return true;
                    }
                    else
                        return false;
                }

            case 'balance_usd':
                if (this.checkCurrency(value))
                    return +value;
                else
                    throw this.my_error;
                                                
            default:
                throw this.my_error;
        }
    }

    checkValid_v2(fn, ln, hand, balance) {
        let invalid_fields = "";

        // if (!Number.isInteger(pid))
        //     invalid_fields += " ,pid";

        if (!(typeof fn === 'string') || !(fn.match(/^[A-Za-z]+$/)))
            invalid_fields += ", fname";

        let flag = false;
        if (ln === undefined) flag = true;
        else {
            if (ln.match(/^[A-Za-z]*$/)) flag = true;
        }
        if (!flag) invalid_fields += ", lname";

        flag = false;
        if (hand != undefined && (hand.toLowerCase() === 'left' || hand.toLowerCase() === 'right' || hand.toLowerCase() === 'ambi'))
            flag = true;
        if (!flag) invalid_fields += ", handed";

        flag = this.checkCurrency(balance);
        if (!flag) invalid_fields += ", initial_balance_usd";

        // console.log(invalid_fields);

        invalid_fields = invalid_fields.slice(2);
        // console.log(invalid_fields);
        return invalid_fields;


    }

    checkCurrency(value) {
        if (!(typeof value === 'number' || typeof value === 'string')) {
            // console.log(1);
            return false;
        }
        const num = +value;
        if (Number.isNaN(num)) {
            // console.log(2);
            return false;    
        }
        if (num < 0) {
            // console.log(3);
            return false;    
        }
        let decimal_places = 0;
        if (!Number.isInteger(num)) {
            // console.log(4);
            decimal_places = num.toString().split('.')[1].length;
        }
        if (decimal_places > 2) {
            // console.log(5);
            return false;
        }
        return true;

    }


    transformatPlayer(ply) {
        let name_new = "";
        if (ply["lname"] === "" || ply["lname"] === null)
            name_new = ply["fname"];
        else
            name_new = ply["fname"] + ' ' + ply["lname"];

        let handed_new = "";
        if (ply["handed"] === 'L') 
            handed_new = "left";
        else if (ply["handed"] === 'R')
            handed_new = 'right';
        else 
            handed_new = "ambi";

        const ply_new = {
            pid: ply["pid"],
            name: name_new,
            handed: handed_new,
            is_active: ply["is_active"],
            balance_usd: (+ply["balance_usd"]).toFixed(2)
        };

        return ply_new;
    }

    async getPlayer(pid) {
        await this.create();

        // console.log(pid);

        if (this.players.length === 0)
            throw this.my_error;
        
        const ply = await this.get_value(pid);
        if (ply) return this.transformatPlayer(ply);
        else throw this.error_2;

        // if (this.players.length === 0)
        //     throw this.my_error;
        // let plys = this.players;
        // for (let ply of plys) {
        //     // console.log("current ply: ", plys[i]["pid"]);
        //     if (ply._id.toString() === pid.toString())
        //         return this.transformatPlayer(ply);
        // }
        // throw this.error_2;
    }

    async getPlayer_original(pid) {
        // used for addCurrency() only

        await this.create();

        if (this.players.length === 0)
            throw this.my_error;
        
        const ply = await this.get_value(pid);
        if (ply) return ply;
        else throw this.error_2;

        // if (this.players.length === 0)
        //     throw this.my_error;
        // let plys = this.players;
        // for (let ply of plys) {
        //     if (ply._id.toString() === pid.toString())
        //         return ply;
        // }
        // throw this.error_2;
    }


    async createPlayer(fname, lname, handed, is_active, balance_usd) {
        // console.log(2);
        await this.create();

        // console.log(3);

        // this.id++;
        // const id_current = this.id;

        const new_player = new Player(
            // id_current,
            this.checkValid('fname', fname),
            this.checkValid('lname', lname),
            this.checkValid('handed', handed), 
            this.checkValid('is_active', is_active),
            this.checkValid('balance_usd', balance_usd)
        );

        // console.log(4);

        const res = await this.insert_value(new_player);

        return res.insertedId.toString();

        // console.log(5);

        // this.content.players.push(new_player);
        // setTimeout(this.update, 200);
        // this.update();
        // return id_current;
    }

    async updatePlayer(pid, attribute, value) {
        await this.create();

        // console.log(pid);
        await this.getPlayer(pid);
        const valid_value = this.checkValid(attribute, value);
        
        const update_obj = {};
        update_obj[attribute] = valid_value;
        
        const res = await this.update_values(pid, update_obj);
        if (res) return;
        else throw new Error("updating failed");

        // const valid_value = this.checkValid(attribute, value);
        // for (let i=0; i<this.content.players.length; i+=1) {
        //     if (this.content.players[i]["pid"] == pid) {
        //         this.content.players[i][attribute] = valid_value;
        //         break;
        //     }
        // }
        // this.update();

        // edit stops here! 
    }

    async deletePlayer(pid) {
        await this.create();

        await this.getPlayer(pid);

        await this.delete_value(pid);



        // for (let i=0; i<this.content.players.length; i+=1) {
        //     if (this.content.players[i]["pid"] == pid) {
        //         this.content.players.splice(i,1);
        //         break;
        //     }
        // }
        // this.update();
    }

    async getBalance(pid) {
        await this.create();

        const ply = await this.getPlayer_original(pid);

        return ply.balance_usd;


        // for (let i=0; i<this.players.length; i+=1) {
        //     if (this.content.players[i]["pid"] == pid) {
        //         return this.content.players[i]["balance_usd"];
        //     }
        // }
       
    }

    async getPlayers() {
        await this.create();

        if (this.players === []) {
            return [];
        }

        const filter = {is_active: true};
        let plys_active = await this.get_values(filter);
        let plys_tosort = [];
        // console.log(this.content.players.length);

        for (let i=0; i<plys_active.length; i+=1) {
            // console.log(this.content.players[i].fname);
            if (plys_active[i]["is_active"] === true) {
                plys_tosort.push(this.transformatPlayer(plys_active[i]));
            }
        }

        plys_tosort.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        return plys_tosort;

    }

    async addCurrency(pid, value) {
        await this.create();

        await this.getPlayer(pid);
        // if (this.getPlayer(pid) === -1) {
        //     throw this.my_error;
        // }

        let currency_current = Number(await this.getBalance(pid));
        await this.updatePlayer(pid, 'balance_usd', currency_current + Number(value));

        // console.log("currency_current: ", currency_current, typeof currency_current);

        let playerBalance = {
            old_balance_usd: currency_current.toFixed(2),
            new_balance_usd: (currency_current + Number(value)).toFixed(2)
        };

        // this.update();
        return playerBalance;
    }


    async update_values(id, values){
      try {
        let set_values = {$set:values};
        let key_value = {_id:this.ObjectId(id.toString())};
        let update_obj = {key_value, set_values};
        
        let response = await this.coll.updateOne(update_obj.key_value, update_obj.set_values);
        if(response.matchedCount == 0){
            console.log(`Error updating ID:${id}`);
            return false;
        }
        else{
            return true;
        }
      } catch (err) {
        // console.dir(err);
      }
    }
  
    async insert_value(value){
        try{
            return await this.coll.insertOne(value);
        } catch(err){
            // console.log(err);
        }
    }
  
    async delete_value(id){
        try {
            let key_value = {_id:this.ObjectId(id.toString())};
            return await this.coll.deleteOne(key_value);
        } catch (err) {
            // console.log(err);
            // next(err);
        }
    }
  
    async get_value(id){
        try {
            if(id.length != 24){
                throw this.my_error;
            }
            // console.log(id);
            let key_value = {_id:this.ObjectId(id.toString())};
            return await this.coll.findOne(key_value);
        } catch (err) {
            // console.dir(err);
        }
    }
  
    async get_values(search_value = null){
        try {
            if(search_value == null) return await this.coll.find({}).toArray();
            else return await this.coll.find(search_value).toArray()
        } catch (err) {
            // console.dir(err);
            // next(err);
        }
    }
  
}
  
const mongo = new MongoDB();


// const psj = new PlayerSourceJson("./data/player.json");

// app.use((req, res, next) => {
//     psj.create();
//     next();
// })

app.get('/ping', (req, res) => {
    res.status(204).end()
})

app.get('/player', async (req, res, next) => {
    try {
        res.status(200).json(await mongo.getPlayers());
        next();
    } catch (error) {
        next(error);
    }
})

app.get('/player/:player_id', async (req, res, next) => {
    try {
        const player_id = req.params.player_id;
        res.status(200).json(await mongo.getPlayer(player_id));
        next();
    } catch (error) {
        next(error);
    }
})

app.delete('/player/:player_id', async (req, res, next) => {
    try {
        const player_id = req.params.player_id;
        await mongo.deletePlayer(player_id);
        res.redirect(303, "/player");
        next();
    } catch (error) {
         next(error);
    }
})

// add a new active player
app.post("/player", async (req, res, next) => {
    try {
        // const id = +req.query["pid"];
        // console.log(1);
        const id = await mongo.createPlayer(
            req.query["fname"],
            req.query["lname"],
            req.query["handed"],
            true,
            req.query["initial_balance_usd"]
        );
        // console.log('?');
        res.redirect(303, `/player/${id}`);
        next();
    } catch (error) {

        // throw error;

        res.status(422);
        res.send("invalid fields: " + mongo.checkValid_v2(
            // +req.query["pid"],
            req.query["fname"],
            req.query["lname"],
            req.query["handed"],
            req.query["initial_balance_usd"]
        ))
        // res.send("invalid fields: " + "fname");
        // next();
    }
})

// update player info
app.post("/player/:player_id", async (req, res, next) => {
    try {
        const pid = req.params.player_id;

        const queries = req.query;
        for (let q in queries) {
            let p = q;
            if (q === "active") 
                p = 'is_active';
            await mongo.updatePlayer(pid, p, queries[q]);
        }
        res.redirect(303, `/player/${pid}`);
        next();
    } catch(error) {
        if (error === mongo.error_2)
            res.status(404).end();
        else 
            res.status(422).end();
    }
})

// add positive currency
app.post("/deposit/player/:player_id", async (req, res, next) => {
    try {
        const pid = req.params.player_id;
        const queries = req.query;
        const amount = Number(queries["amount_usd"]);
        if (!mongo.checkCurrency(amount)) {
            res.status(400).end();
            next();
        } else {
            res.status(200).send(await mongo.addCurrency(pid, amount));
            next();    
        }

    } catch (error) {
        next(error);
    }
})

app.use((err, req, res, next) => {
    // throw err;
    res.status(404).end();
    next();
})

  


