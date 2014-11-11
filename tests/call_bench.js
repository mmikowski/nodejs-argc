/*jslint            node : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

// BEGIN declare module symbols
var 
  i, ret_str,
  start_ms, end_ms, run_map_s, run_pos_s,
  ops_map_ratio, ops_pos_ratio, perf_percent,

  loop_count = 1000000,
  count_name = 'one million',

  getStrFromMap, getStrFromList;
// END declare module symbols

// BEGIN declare test functions
getStrFromMap = function ( arg_map ) {
  return 'a:' + arg_map.a_str + 'b:' + arg_map.b_str
       + 'c:' + arg_map.c_str + 'd:' + arg_map.d_str;
};
getStrFromList = function ( a_str, b_str, c_str, d_str ) {
  return 'a:' + a_str + 'b:' + b_str + 'c:' + c_str + 'd:' + d_str;
};
getTimestamp = function () {
  return +new Date();
};

// END declare test functions

// BEGIN test positional arguments
start_ms = getTimestamp();
for ( i = 0; i < loop_count; i++ ) { 
  ret_str = getStrFromList(
    String(i),String(i+1),String(i+2),String(i+3)
  );
}
end_ms = getTimestamp();

run_pos_s     = ( end_ms - start_ms ) / 1000;
ops_pos_ratio = loop_count / run_pos_s;
// END test positional arguments

// BEGIN test named arguments
start_ms = getTimestamp();
for ( i = 0; i < loop_count; i++ ) {
  ret_str = getStrFromMap({
    a_str : String(i),   b_str : String(i+1),
    c_str : String(i+2), d_str : String(i+3)
  });
}
end_ms = getTimestamp();

run_map_s     = ( end_ms - start_ms ) / 1000;
ops_map_ratio = loop_count / run_map_s;
// END test named arguments

// BEGIN report results
perf_percent = Math.round(
  ( ( ops_pos_ratio - ops_map_ratio ) / ops_pos_ratio ) * 100
);
console.log( '=== Comparison of positional vs. name parameters ===' );
console.log( '= Positional =' );
console.log( '  ' + String( run_pos_s.toFixed(2) )
  + 's for ' + count_name + ' calls'
);
console.log( '  ' + String( ops_pos_ratio.toFixed(0) ) + ': Operations / s' );
console.log( '' );

console.log( '= Named =' );
console.log( '  ' + String( run_map_s.toFixed(2) )
  + 's for ' + count_name + ' calls'
);
console.log( '  ' + String( ops_map_ratio.toFixed(0) ) + ': Operations / s' );
console.log( '' );

console.log( '= Comparative Perf =' );
console.log( '  Positional is ' + String( perf_percent.toFixed(1) ) + '% faster' );
// END report results

