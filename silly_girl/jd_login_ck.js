/**
 * @title 京东ck登录
 * @origin David
 * @rule ^pt_key=\s*[^;]*;\s*pt_pin=\s*[^;]*
 * @author david
 * @version v0.0.1
 * @description 京东ck登录
 * @create_at 2023-09-01 11:21:46
 * @public false
 */
const QingLong = require("QingLong")

const qinglong = Bucket("qinglong")
const ql = Bucket("ql")


function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseStringToObject(str) {
    let parts = str.split(";");
    let result = {};

    parts.forEach((part) => {
        let keyValue = part.split("=");
        let key = keyValue[0].trim();
        let value = keyValue[1];
        result[key] = value;
    });

    return result;
}

function checkCKExist(url, token, pt_pin){
    return new Promise((resolve)=>{
        // console.log(url, token, pt_pin)
        let { body, headers, status } = request({
            url: `${url}/open/envs`,
            header:{
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json;charset=UTF-8",
                "Accept": "application/json"
            }
        })
        body = JSON.parse(body)
        // console.log(body)
        if(body.code === 200 && body.data.length > 0){
            let cks = body.data.filter(item => {
                if(item.name == "JD_COOKIE"){
                    let _ck = parseStringToObject(item.value)
                    let _pin = _ck.pt_pin;
                    if(_pin == pt_pin){
                        return true
                    }else {
                        return false
                    }
                }
                return false
            })
    
            resolve(cks)
        }else{
            resolve([])
        }
    })    
}

function pushCkToQl(url,token,ck){
    return new Promise((resolve)=>{
        let { body, headers, status } = request({
            url: `${url}/envs`,
            header:{
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json;charset=UTF-8",
                "Accept": "application/json"
            },
            method: "post",
            body: [
                {
                    "value": `${ck}`,
                    "name": "变量名",
                    "remarks": "备注"
                }
            ],
            dataType: "json",
        })
    })
}

function getToken(url, clientId, clientSecret){
    return new Promise((resolve)=>{
        let { body, headers, status } = request({
            url: `${url}/open/auth/token?client_id=${clientId}&client_secret=${clientSecret}`
        })
        resolve({body, headers, status})
    })
}

async function main() {
    const msg = s.getContent()
    let pattern = /pt_key=\s*[^;]*;\s*pt_pin=\s*[^;]*;/;
    if (!pattern.test(msg)) {
        s.reply(`格式不对，请检查格式是否为pt_key=xx;pt_pin=xx;`)
        return;
    }
    let client_ids = qinglong.keys()
    if (client_ids.length == 0) {
        console.log("未配置青龙")
        return
    }

    let pushJdCk = parseStringToObject(msg)

    let client = new QingLong(client_ids[0])
    let qlUrl = ''
    try{
        qlUrl = client["address"]
    }catch(e){
        s.reply(`青龙地址未配置，请联系管理员`)
    }

    // 获取平台信息
    const plantInfo =  await s.getPlatform() // wx tg qq

    // 获取对应的存储桶
    let plantInfoBucket = Bucket(`pin${plantInfo.toUpperCase()}`)

    // 获取存储桶中的用户ID 没有就存一下
    let userBucketCk = plantInfoBucket.get(pushJdCk.pt_pin)
    if(!userBucketCk){
        plantInfoBucket.set(pushJdCk.pt_pin,s.getUserId())
    }
    // let {body, headers, status} = await getToken(qlUrl,client["client_id"],client["client_secret"])
    // body = JSON.parse(body)
    // console.log(body)
    // let token = body.data.token;

    // let cks = await checkCKExist(qlUrl, token, pushJdCk.pt_pin)
    // if(cks.length == 0){
    //     // QL里面没有
    //     console.log(1,cks)
    // }else{
    //     // QL 里面存在
    //     console.log(2,cks)
    // }
    
    let isExistCk = null
    let cks = await client.getEnvs()
    cks.forEach((item) => {
        let { id, name, value } = item;
        let _ck = parseStringToObject(value)
        if(_ck.pt_pin == pushJdCk.pt_pin){
            // 存在QL里面
            isExistCk = item
        }
    })
    // console.log("----------------",isExistCk)
    if(isExistCk){
        //存在的CK
        let res = await client.updateEnv({ id:isExistCk.id, name: isExistCk.name, value:msg, remarks: isExistCk.remarks })
        await client.enableEnvs([isExistCk.id])
        s.reply("更新成功")
    }else{
        // 不存在创建
        let res = client.createEnvs([{  name: "JD_COOKIE", value:msg, remarks: pushJdCk.pt_pin }])
        await client.enableEnvs([res.id])
        s.reply("加入车队成功")
    }
 
}
main()

