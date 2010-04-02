require.paths.unshift('lib/express/lib')
require('express')
require('express/plugins')
//  Web Part
configure(function(){
  use(MethodOverride)
  use(ContentLength)
  use(Cookie)
  use(Cache, { lifetime: (5).minutes, reapInterval: (1).minute })
  use(Session, { lifetime: (15).minutes, reapInterval: (1).minute })
  use(Static)
  use(Logger)
  set('root', process.__root)
})

get('/', function() {
    this.pass('/board');
});
get('/board', function() {
  this.render('board.haml.html', { 
      layout:false,
      locals: { }
  });
});
get('/launcher', function() {
  return "<html><head><script type=\"text/javascript\" src=\"public/javascripts/jquery-1.4.2.min.js\"></script> <script type=\"text/javascript\"> $(document).ready(function () { for(var i=0;i<1000;i++) window.open('/');});</script></head><body/></html>"
})
require('sys').puts(set('root'))

run(8080);