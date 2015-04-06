Cache, Proxies, Queues
=========================

### Setup

* Clone this repo, run `npm install`.
* Install redis and run on localhost:6379

From http://redis.io/topics/quickstart.  This can be done on a VM with an open port on 6379 with port forwarding:  
```
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
sudo make 
redis-server
```


###Usage
`node main.js REDIS_PORT [MIRROR_TO_PORT]`