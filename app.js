var sys= require('sys');
process.__root= __dirname;

require('./lib/ws_server'); // Pull in and start the web socket server
require('./lib/express_server'); // Pull in and start the express http server
sys.puts( 'Server Started' )
