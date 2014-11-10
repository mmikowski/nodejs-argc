/*!
 * argc - Named argument checker library for JavaScript
 * version: 0.1.2 for nodejs
 *
 * Michael Mikowski - mike.mikowski@gmail.com
 * This is an original work inspired by my Perl modules, checkArgs.pm
 * Copyright (C) 2005-2014 Michael Mikowski.
 *
*/

/*jslint            node : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
var argc = (function () {
  'use strict';
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    integerRegex = /^[+\-]?[0-9]+$/,
    nameCheckMap = {
      any_regex     : /^_data_?$/,
      array_regex   : /_list_?$/,
      boolean_regex : /^(allow|is|do|has|have|be|if|dont)_/,
      map_regex     : /_map_?$/,
      integer_regex : /_(count|idx|idto|idint|ms|px)_?$/,
      jquery_regex  : /^\$/,
      number_regex  : /_(num|ratio)_?$/,
      object_regex  : /^_obj_?$/,
      regex_regex   : /^_(regex|rx)_?$/,
      string_regex  : /_(name|key|type|text|html)_?$/,
      svgelem_regex : /^_svg_?$/
    },
    stateMap = { mode_key : 'normal' },

    pushError, makeErrorObj,
    getVarType, checkArg, setMode, checkArgMap;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //----------- BEGIN NON-BROWSER UTILITY METHODS --------------
  // BEGIN non-browser utility /makeError/
  // Purpose: a convenience wrapper to create an error object
  // Arguments:
  //   * name_text - the error name
  //   * msg_text  - long error message
  //   * data      - optional data attached to error object
  // Returns  : newly constructed error object
  // Throws   : none
  //

  makeErrorObj = function ( name_text, msg_text, data ) {
    var error_obj = new Error();
    error_obj.name = 'argc:' + name_text;
    if ( msg_text ) { error_obj.description = msg_text; }
    if ( data ) { error_obj.data = data; }

    return error_obj;
  };
  // END non-browser utility /makeError/

  // BEGIN non-browser utility /pushError/
  pushError = function (
    msg_list, arg_name, rule_map, data_arg, rule_msg_list
  ) {
    var msg_text, val_text;

    msg_text
      = ( rule_map.is_optional ? 'Optional ' : '')
      + 'Argument |'   + arg_name + '| data type |'
      + ( rule_map.var_type || 'not provided') + '| '
      ;

    val_text = data_arg ? data_arg.toString() : '';
    if ( val_text.length > 20 ) {
      msg_text += '(' + val_text.substr(0,17) + '...)';
    }
    else { msg_text += val_text; }

    msg_list.push(
      msg_text + ' ' + rule_msg_list.join( '\r\n  * ' )
    );
    // END non-browser utility /pushError/
  };

  // BEGIN non-browser utility /getVarType/
  // Returns'Function','Object','Array',
  // 'String','Number','Null','Boolean', or'Undefined'
  //
  getVarType = (function () {
    var typeof_map, get_var_type;

    typeof_map = {
      'undefined' : 'Undefined',
      'boolean'   : 'Boolean',
      'number'    : 'Number',
      'string'    : 'String',
      'function'  : 'Function',

      'Undefined'      : 'Undefined',
      'Null'           : 'Null',
      'Boolean'        : 'Boolean',
      'Number'         : 'Number',
      'String'         : 'String',
      'Function'       : 'Function',
      'Array'          : 'Array',
      'RegExp'         : 'RegExp',
      'StyleSheetList' : 'StyleSheetList'
    };

    get_var_type = function ( data ) {
      var type, type_str;

      if ( data === null      ) { return 'Null'; }
      if ( data === undefined ) { return 'Undefined'; }

      type = typeof data;
      type_str = typeof_map[ type ];

      if ( type_str ) { return type_str; }

      type = {}.toString.call( data ).slice( 8, -1 );

      return typeof_map[ type ] ||
      ( data instanceof Array ? 'Array' :
        ( data.propertyIsEnumerable( '0' )
        && data.length !== undefined
          ? 'Array' : 'Object'
        )
      );
    };

    return get_var_type;
  }());
  // END non-browser utility /getVarType/

  // BEGIN non-browser utility /checkArg/
  checkArg = function (
    rule_var_type, real_var_type, rule_msg_list, rule_row_map, data_arg
  ) {
    var item_count;

    switch ( rule_var_type ) {
      case 'any'   :
        break;
      case 'array' :
        if ( real_var_type !== 'Array' ) {
          rule_msg_list.push( 'is not an array' );
        }

        item_count = data_arg.length;

        if ( ! rule_row_map.is_empty_ok && item_count === 0 ) {
          rule_msg_list.push( 'is empty' );
        }

        if ( rule_row_map.max_length
          && item_count > rule_row_map.max_length
        ) {
          rule_msg_list.push(
            'exceeds maxiumum length: ' + String( item_count )
            + ' > ' + String( rule_row_map.max_length )
          );
        }

        if ( rule_row_map.min_length
          && item_count < rule_row_map.min_length
        ) {
          rule_msg_list.push(
            'below minimum length: ' + String( item_count )
            + ' < ' + String( rule_row_map.min_length )
          );
        }
        break;
      case 'boolean' :
        if ( real_var_type !== 'Boolean' ) {
          rule_msg_list.push( 'is not a boolean' );
        }
        break;
      case 'function' :
        if ( real_var_type !== 'Function' ) {
          rule_msg_list.push( 'is not a function' );
        }
        break;
      case 'integer' :
        if ( real_var_type !== 'Number' ) {
          rule_msg_list.push( 'is not a number (' + real_var_type + ')' );
          break;
        }

        if ( ! integerRegex.test( String( data_arg ) ) ) {
          rule_msg_list.push( 'is not an integer' );
          break;
        }

        if ( rule_row_map.hasOwnProperty( 'max_int' )
          && data_arg > rule_row_map.max_int
        ) {
          if ( rule_row_map.do_autobound ) { 
            data_arg = rule_row_map.max_int;
          }
          else {
            rule_msg_list.push(
              'exceeds allowed maximum of ' + rule_row_map.max_int
            );
          }
        }

        if ( rule_row_map.hasOwnProperty( 'min_int' )
          && data_arg < rule_row_map.min_int
        ) {
          if ( rule_row_map.do_autobound ) {
            data_arg = rule_row_map.min_int;
          }
          else {
            rule_msg_list.push(
              'below allowed minimum of ' + rule_row_map.min_int
            );
          }
        }
        break;
      case 'map' :
        if ( real_var_type !== 'Object' ) {
          rule_msg_list.push( 'is not a map' );
          break;
        }

        if ( ! rule_row_map.is_empty_ok
          && Object.keys( data_arg ).length < 1
        ) {
          rule_msg_list.push( 'is empty' );
        }
        break;
      case 'number':
        if ( real_var_type !== 'Number' ) {
          rule_msg_list.push( 'is not a number' );
          break;
        }

        if ( rule_row_map.hasOwnProperty( 'max_num' )
          && data_arg > rule_row_map.max_num
        ) {
          if ( rule_row_map.do_autobound ) { data_arg = rule_row_map.max_num; }
          else {
            rule_msg_list.push(
              'exceeds allowed maximum of ' + rule_row_map.max_num
            );
          }
        }

        if ( rule_row_map.hasOwnProperty( 'min_num' )
          && data_arg < rule_row_map.min_num
        ) {
          if ( rule_row_map.do_autobound ) { data_arg = rule_row_map.min_num; }
          else {
            rule_msg_list.push(
              'below allowed minimum of ' + rule_row_map.min_num
            );
          }
        }
        break;
      case 'string' :
        if ( real_var_type !== 'String' ) {
          rule_msg_list.push( 'is not a string' );
          break;
        }

        item_count = data_arg.length;

        if ( rule_row_map.filter_regex ) {
          if ( ! rule_row_map.filter_regex.test( data_arg ) ) {
            rule_msg_list.push(
              'does not pass regex filter: '
              + rule_row_map.filter_regex.toString()
            );
          }
        }

        if ( ! rule_row_map.is_empty_ok
          && ! rule_row_map.filter_regex
          && data_arg === ''
        ) { rule_msg_list.push( 'is empty' ); }

        if ( rule_row_map.max_length
          && item_count > rule_row_map.max_length
        ) {
          rule_msg_list.push( 
            'is longer than max length ' + String( rule_row_map.max_length )
          );
        }

        if ( rule_row_map.min_length
          && item_count < rule_row_map.min_length
        ) {
          rule_msg_list.push( 'is shorter than min length '
            + String( rule_row_map.min_length )
          );
        }
        break;
      case 'svgelement' :
        if ( real_var_type !== 'SVGGElement' ) {
          rule_msg_list.push( 'is not an SVG element (' + real_var_type + ')' );
        }
        break;
      default :
        rule_msg_list.push( 'data type ' + rule_var_type + ' is not supported' );
        break;
    }

    // Return the value of the argument, which may have been adjusted above.
    // The logic appends to rule_msg_list if there are errors.
    //
    return data_arg; 
  };
  //------------ END NON-BROWSER UTILITY METHODS ---------------

  //------------------- BEGIN PUBLIC METHODS -------------------
  // BEGIN public method /setMode( <mode_key> )/
  // Purpose   : Set the global behavior of the argc library
  // Example   :
  //   <script src="" />
  //   <script>argc.setMode( 'strict' );</script>
  // Required Argument :
  //   * mode_key ( '[strict|normal|off]' )
  // Optional Argument : none
  // Setting the mode affects the behavior of checkArgMap.
  //   IN 'strict' MODE, the special directive keys are set as follows:
  //     * _do_check_names  : true
  //     * _allow_more_keys : false
  //     * _skip_key_list   : []
  //   IN 'normal' MODE the utility works as normal.
  //   IN 'off' MODE , the utility is a no-op and simply returns.
  // Returns   : none
  // Throws    : an error object if validation fails
  //
  setMode = function ( mode_key ) {
    if ( getVarType( mode_key ) !== 'String' ) {
      stateMap.mode_key = 'normal';
      return;
    }
    switch ( mode_key ) {
      case 'off' :
      case 'disabled' :
        stateMap.mode_key = 'off'; break;
      case 'strict' :
        stateMap.mode_key = 'strict'; break;
      default :
        stateMap.mode_key = 'normal'; break;
    }
  };
  // END public method /setMode/

  // BEGIN public method /checkArgMap/
  // Purpose   : Provide an easy and efficient means to check named arguments
  // Example   :
  //   <script src="" />
  //   <script>
  //   argc.setMode( 'strict' );
  //   foo = function ( arg_map ) {
  //     try {
  //       argc.checkArgMap(
  //         { item_id          : { var_type : 'string' },
  //           left_px          : {
  //             var_type       : 'number',
  //             data_default   : 1280,
  //             min_num        : 0,
  //             max_num        : 2560
  //           },
  //           top_px           : {
  //             var_type       : 'number',
  //             data_default   : 400,
  //             min_num        : 0,
  //             max_num        : 2560
  //           },
  //           height_px        : {
  //             var_type       : 'integer',
  //             data_default   : 50,
  //             min_int        : 1,
  //             max_int        : 50,
  //             is_optional    : true
  //           },
  //           width_px         : {
  //             var_type       : 'integer',
  //             data_default   : 50,
  //             min_int        : 1,
  //             max_int        : 50,
  //             is_optional    : true
  //           },
  //           color_map   : { var_type : 'map',     is_empty_ok : false },
  //           element_map : { var_type : 'map',     is_empty_ok : true,
  //             data_default : {}   },
  //           is_pinned   : { var_type : 'boolean', data_default : false },
  //           is_seen     : { var_type : 'boolean', data_default : false },
  //           mode_type   : { var_type : 'string',  data_default : 'view',
  //             filter_regex  : /^view$|^edit$/ },
  //           form_map    : { var_type : 'map',     data_default : null  }
  //         }, arg_map
  //       );
  //     }
  //     catch ( error_obj ) {
  //       console.trace( error_obj );
  //       throw error_obj;
  //     }
  //     ...
  //   };
  //   </script>
  //
  // Required Arguments :
  //   * rule_map - a map of rules used to check arguments
  //   * arg_map  - a map of arguments to check
  //
  //   The rule_map is used to test the arg_map.
  //   Each key in the rule_map corresponds to an argument name
  //   except for special keys noted below.  Therefore, the format is:
  //     rule_map = {
  //       <name_1> : { var_type : <var_type>, <optional constraints> },
  //       <name_2> : { var_type : <var_type>, <optional constraints> },
  //       ...
  //     };
  //
  //   Optional constraints for all <var_type>'s include:
  //      is_optional  - is an optional argument
  //      default_data - default value if key is omitted
  //
  //   Optional constraints by data type include:
  //     * array:
  //       + is_empty_ok  - allow empty array
  //       + min_length   - min allowed length
  //       + max_length   - max allowed length
  //     * boolean:
  //     * function:
  //     * integer:
  //       + min_int      - min allowed value
  //       + max_int      - max allowed value
  //       + do_autobound - auto bound input to min/max as appropriate
  //     * map/object:
  //       + is_empty_ok  - allow an empty object
  //     * number:
  //       + min_num      - min allowed value
  //       + max_num      - max allowed value
  //       + do_autobound - auto bound input to min/max as appropriate
  //     * string:
  //       + is_empty_ok  - allow empty string
  //       + filter_regex - a regex filter that must be passed
  //       + min_length   - min allowed length
  //       + max_length   - max allowed length
  //     * svgelem:
  //
  //   Special directive keys
  //     * _do_check_names : When true, will
  //       compare key names against a naming convention
  //       (see nameCheckMap for configuration)
  //       WARNING: checkArgMap in 'strict' mode always sets this to true.
  //     * _allow_more_keys : When true, check ignores keys not defined
  //       in the check map.  Normal behavior is to throw an error.
  //       WARNING: checkArgMap in 'strict' mode ignores this flag.
  //     * _skip_key_list   : A list of key names to skip consideration.
  //       WARNING: checkArgMap in 'strict' mode ignores this list.
  //     * _allow_falsey_value : When true, skips validation for an
  //       if its value isNaN, Null, or other falsey value other than
  //       0 or undefined.
  //
  // Optional Argument : none
  // Settings  : checkArgMap.configModule.setMode( '[strict|normal|off]' )
  //   affects the behavior of checkArgMap.
  //   IN 'strict' MODE, the special directive keys are processed as follows:
  //     * _do_check_names  : true
  //     * _allow_more_keys : false
  //     * _skip_key_list   : []
  //   IN 'normal' MODE the utility works as above.
  //   IN 'off' MODE , the utility is a no-op and simply returns.
  // Returns   : none
  // Throws    : an error object if validation fails
  //
  checkArgMap = function ( rule_map, arg_map ) {
    var
      mode_key = stateMap.mode_key,

      do_check_names, error_obj,
      rule_key, rule_row_map, rule_msg_list,
      data_arg, real_var_type, rule_var_type,
      regex_name, msg_list, unseen_map
      ;

    // Make this call a no-op if mode is 'off'
    if ( mode_key === 'off' ) { return; }

    // Check arguments for this routine
    if ( getVarType( rule_map ) !== 'Object'
      || getVarType( arg_map )  !== 'Object'
    ) {
      error_obj = makeErrorObj(
        'Bad Input',
        'Input does not consist of two maps',
        { rule_map: rule_map, arg_map: arg_map  }
      );
      console.error( error_obj );
      throw error_obj;
    }

    // Declare and initialize unseen map
    msg_list   = [];
    unseen_map = {};

    Object.keys( arg_map ).map(
      function ( arg_name ) { unseen_map[ arg_name ] = true; }
    );

    // Remove skip_key_list from unseen_map.  This results in skipping
    // validation for the values of the keys provided.
    // Strict mode does not allow this.
    //
    if ( rule_map._skip_key_list && mode_key !== 'strict' ) {
      rule_map._skip_key_list.map(
        function( arg_name ) { delete unseen_map[ arg_name ]; }
      );
    }

    do_check_names = mode_key === 'strict'
      ? true : !! rule_map._do_check_names;

    // Begin loop through rules and dispatch
    RULE: for ( rule_key in rule_map ) {
      if ( rule_map.hasOwnProperty( rule_key ) ) {

        rule_row_map = rule_map[ rule_key ];
        rule_msg_list = [];
        data_arg      = arg_map[ rule_key ];
        real_var_type = getVarType( data_arg );
        rule_var_type = rule_row_map.var_type;

        // Skip "private" properties
        if ( rule_key.substr( 0,1 ) === '_' ) { continue RULE; }

        // Skip if not found in unseen_map
        if ( ! unseen_map.hasOwnProperty( rule_key ) ) {
          continue RULE;
        }

        delete unseen_map[ rule_key ];

        if ( ! rule_var_type ) {
          rule_msg_list.push( 'Required rule *var_type* not provided' );
          pushError(
            msg_list, rule_key, rule_row_map, data_arg, rule_msg_list
          );
          continue RULE;
        }

        if ( data_arg === undefined ) {
          if ( rule_row_map.hasOwnProperty( 'data_default' ) ) {
            data_arg = rule_row_map.data_default;
            arg_map[rule_key] = data_arg;
            real_var_type     = getVarType( data_arg );
          }
          else if ( ! rule_row_map.is_optional ) {
            rule_msg_list.push( 'is required but not provided.' );
            pushError(
              msg_list, rule_key, rule_row_map, data_arg, rule_msg_list
            );
            continue RULE;
          }
        }

        // Check property names if requested
        if ( do_check_names ) {
          regex_name =  rule_var_type + '_regex';
          if ( nameCheckMap[ regex_name ]
            && ! nameCheckMap[ regex_name ].test( rule_key )
          ) {
            rule_msg_list.push( 'name does not match convention - '
              + nameCheckMap[regex_name].toString()
            );
          }
        }

        // Continue if null, undef, and other falsey values ok
        if ( ! data_arg && data_arg !== 0 && rule_row_map._allow_falsey_value ) {
          continue RULE;
        }

        // check required arguments
        if ( arg_map.hasOwnProperty( rule_key )
          && data_arg
          && rule_row_map.is_optional !== true
        ) {
         
          // The check may mutate the value, so we set it here
          arg_map[ rule_key ]= checkArg(
             rule_var_type, real_var_type, rule_msg_list, rule_row_map, data_arg
          );
        }

        if ( rule_msg_list.length > 0 ) {
          pushError( msg_list, rule_key, rule_row_map, data_arg, rule_msg_list );
        }
      }
    }
    // End loop through rules and dispatch

    // report unexpected arguments
    if ( mode_key === 'strict' || ! rule_map._allow_more_keys ) {
      Object.keys( unseen_map ).map( function ( rule_key ) {
        msg_list.push( 'Unexpected argument |' + rule_key + '| provided.');
      });
    }

    if ( msg_list.length > 0 ) {
      error_obj = makeErrorObj(
        'Bad Input',
        'Did not pass validation criteria',
        { msg_list : msg_list, 
          rule_map : rule_map,
          arg_map  : arg_map
        }
      );

      console.error( error_obj );
      throw error_obj;
    }
  };
  // END public method /checkArgMap/

  return {
    setMode      : setMode,
    checkArgMap  : checkArgMap
  };
  //-------------------- END PUBLIC METHODS --------------------
}());
module.exports = argc;

