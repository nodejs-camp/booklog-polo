/**
 * Module dependencies.
 */

var express = require('../../lib/express');

// Path to our public directory

var pub = __dirname + '/public';

// setup middleware

var app = express();
app.use(express.static(pub));

// Optional since express defaults to CWD/views

app.set('views', __dirname + '/views');

// Set our default template engine to "jade"
// which prevents the need for extensions
// (although you can still mix and match)
app.set('view engine', 'jade');

var posts=[{
	subject:'Hello',
	content:['1','2','3']
},{
	subject:'Hello2',
	content:'Hi'

}];
var count=0;

app.all('*', function(req, res, next){
  if (!req.get('Origin')) return next();
  // use "*" here to accept any origin
  res.set('Access-Control-Allow-Origin', '*');//*可以允許不同網遇的人瀏覽
  res.set('Access-Control-Allow-Methods', 'PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');//設定http 的擋頭
  // res.set('Access-Control-Allow-Max-Age', 3600);
  if ('OPTIONS' == req.method) return res.send(200);
  next();
  
});

app.get('/welcome',function(req, res){
	res.render('index');//開啟歡迎畫面 在views 裡的index.js 設定畫面
});


app.get('/download',function(req, res){//使用workflow 簡單，明確，快速
	var events=require('events');
	var workflow= new events.EventEmitter();
	
	workflow.outcome={
		success:false,
	}

	workflow.on('vaidate',function(){
		var password=req.query.password;
		if (password==='12345') {

			return workflow.emit('success');
		};
		return workflow.emit('error');
		
	});

	workflow.on('success',function(){
		workflow.outcome.success=true;
		workflow.outcome.render={
			url:'/welcome'
		};
		res.download('./Users/mac/Desktop/Thumbs.db')
		workflow.emit('response');
	});
	workflow.on('error',function(){
		workflow.outcome.success=false;
		workflow.emit('response');
		
	});

		workflow.on('response',function(){
		
			if (workflow.outcome===true) {
				res.send([workflow.outcome,{count:count}]);

			}else{
				count++
				if (count>3) {

					res.send('錯了 '+count+' 次');
				}else{

					res.send([workflow.outcome,{count:count}]);
				}

			}
				
			

		});


	return workflow.emit('vaidate');
});



app.get('/post',function(req, res){
	res.render('post',{
		post:posts//在views 裡的post 設定畫面

	});
});






app.get('/1/post',function(req, res){
	res.send(posts);
});



app.post('/1/post',function(req, res){
	var subject;
	var content;
	if (typeof(req.body) === 'undefined') {
		subject = req.query.subject;
		content = req.query.content;
	}

	var post={
		//前面的值為Key 所以不一定要加上“”
		subject:subject+count,
		content:content
	};

	posts.push(post);
	//res.send(posts);
	res.send({status:"OK",posts:posts,count:count});
});



app.get('/1/post',function(req, res){

});
app.put('/1/post/:postId',function(req, res){
	var id=req.params.postId;
	res.send("Update a post: "+id);
});
app.delete('/1/post',function(req, res){
	var result={
		title:"Delete",
		content:"true"
	};
	res.send(result);
});

// change this to a better error handler in your code
// sending stacktrace to users in production is not good
app.use(function(err, req, res, next) {
  res.send(err.stack);
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}
