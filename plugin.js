(function() {
  'use strict';

  var Defined = {
    api: 'lampac',
    localhost: 'https://rc.bwa.to/',
    apn: ''
  };

  var balansers_with_search;
  
  var unic_id = Lampa.Storage.get('lampac_unic_id', '');
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', unic_id);
  }
  
    function getAndroidVersion() {
  if (Lampa.Platform.is('android')) {
    try {
      var current = AndroidJS.appVersion().split('-');
      return parseInt(current.pop());
    } catch (e) {
      
 return 0;
    }
  } else {
    return 0;
  }
}

var hostkey = 'https://rc.bwa.to'.replace('http://', '').replace('https://', '');

if (!window.rch_nws || !window.rch_nws[hostkey]) {
  if (!window.rch_nws) window.rch_nws = {};

  window.rch_nws[hostkey] = {
    type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
    startTypeInvoke: false,
    rchRegistry: false,
    apkVersion: getAndroidVersion()
  };
 }

window.rch_nws[hostkey].typeInvoke = function rchtypeInvoke(host, call) {
  if (!window.rch_nws[hostkey].startTypeInvoke) {
    window.rch_nws[hostkey].startTypeInvoke = true;
 var check = function check(good) {
      window.rch_nws[hostkey].type = Lampa.Platform.is('android') ?
 'cors' : 'web';
      call();
    };

    if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) check(true);
 else {
      var net = new Lampa.Reguest();
 net.silent('https://rc.bwa.to'.indexOf(location.host) >= 0 ? 'https://github.com/' : host + '/cors/check', function() {
        check(true);
      }, function() {
        check(false);
      }, false, {
        dataType: 'text'
      });
 }
  } else call();
};

window.rch_nws[hostkey].Registry = function RchRegistry(client, startConnection) {
  window.rch_nws[hostkey].typeInvoke('https://rc.bwa.to', function() {

    client.invoke("RchRegistry", JSON.stringify({
      version: 149,
      host: location.host,
      rchtype: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : window.rch_nws[hostkey].type,
      apkVersion: window.rch_nws[hostkey].apkVersion,
      player: Lampa.Storage.field('player'),
	  account_email: Lampa.Storage.get('account_email'),
	  unic_id: Lampa.Storage.get('lampac_unic_id', ''),
	  profile_id: Lampa.Storage.get('lampac_profile_id', ''),
	  token: ''
    }));

    if (client._shouldReconnect && window.rch_nws[hostkey].rchRegistry) {
      if (startConnection) startConnection();
   
 return;
    }

    window.rch_nws[hostkey].rchRegistry = true;

    client.on('RchRegistry', function(clientIp) {
      if (startConnection) startConnection();
    });

    client.on("RchClient", function(rchId, url, data, headers, returnHeaders) {
      var network = new Lampa.Reguest();
 function result(html) {
        if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
          html = JSON.stringify(html);
 }

        if (typeof CompressionStream !== 'undefined' && html && html.length > 1000) {
          var compressionStream = new CompressionStream('gzip');
 var encoder = new TextEncoder();
          var readable = new ReadableStream({
            start: function(controller) {
              controller.enqueue(encoder.encode(html));
              controller.close();
            }
          });
 var compressedStream = readable.pipeThrough(compressionStream);
          new Response(compressedStream).arrayBuffer()
            .then(function(compressedBuffer) {
              var compressedArray = new Uint8Array(compressedBuffer);
              if (compressedArray.length > html.length) {
                client.invoke("RchResult", rchId, html);
              } else {
            
     $.ajax({
                  url: 'https://rc.bwa.to/rch/gzresult?id=' + rchId,
                  type: 'POST',
                  data: compressedArray,
                  async: true,
                  
 cache: false,
                  contentType: false,
                  processData: false,
                  success: function(j) {},
                  error: function() {
                    client.invoke("RchResult", 
 rchId, html);
                  }
                });
              }
            })
            .catch(function() {
              client.invoke("RchResult", rchId, html);
          
   });

        } else {
          client.invoke("RchResult", rchId, html);
 }
      }

      if (url == 'eval') {
        console.log('RCH', url, data);
 result(eval(data));
      } else if (url == 'evalrun') {
        console.log('RCH', url, data);
        eval(data);
 } else if (url == 'ping') {
        result('pong');
 } else {
        console.log('RCH', url);
 network["native"](url, result, function() {
          console.log('RCH', 'result empty');
          result('');
        }, data, {
          dataType: 'text',
          timeout: 1000 * 8,
          headers: headers,
          returnHeaders: returnHeaders
        });
 }
    });

    client.on('Connected', function(connectionId) {
      console.log('RCH', 'ConnectionId: ' + connectionId);
      window.rch_nws[hostkey].connectionId = connectionId;
    });
 client.on('Closed', function() {
      console.log('RCH', 'Connection closed');
    });
 client.on('Error', function(err) {
      console.log('RCH', 'error:', err);
    });
  });
};
  window.rch_nws[hostkey].typeInvoke('https://rc.bwa.to', function() {});
 function rchInvoke(json, call) {
    if (window.nwsClient && window.nwsClient[hostkey] && window.nwsClient[hostkey]._shouldReconnect){
      call();
      return;
 }
    if (!window.nwsClient) window.nwsClient = {};
    if (window.nwsClient[hostkey] && window.nwsClient[hostkey].socket)
      window.nwsClient[hostkey].socket.close();
 window.nwsClient[hostkey] = new NativeWsClient(json.nws, {
      autoReconnect: false
    });
 window.nwsClient[hostkey].on('Connected', function(connectionId) {
      window.rch_nws[hostkey].Registry(window.nwsClient[hostkey], function() {
        call();
      });
    });
 window.nwsClient[hostkey].connect();
  }

  function rchRun(json, call) {
    if (typeof NativeWsClient == 'undefined') {
      Lampa.Utils.putScript(["https://rc.bwa.to/js/nws-client-es5.js?v18112025"], function() {}, false, function() {
        rchInvoke(json, call);
      }, true);
 } else {
      rchInvoke(json, call);
 }
  }

  function account(url) {
    url = url + '';
 if (url.indexOf('account_email=') == -1) {
      var email = Lampa.Storage.get('account_email');
 if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
    }
    if (url.indexOf('uid=') == -1) {
      var uid = Lampa.Storage.get('lampac_unic_id', '');
 if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
    }
    if (url.indexOf('token=') == -1) {
      var token = '';
 if (token != '') url = Lampa.Utils.addUrlComponent(url, 'token=');
    }
    if (url.indexOf('nws_id=') == -1 && window.rch_nws && window.rch_nws[hostkey]) {
      var nws_id = window.rch_nws[hostkey].connectionId ||
 '';
      if (nws_id) url = Lampa.Utils.addUrlComponent(url, 'nws_id=' + encodeURIComponent(nws_id));
    }
    return url;
 }
  
  var Network = Lampa.Reguest;

  function component(object) {
    var network = new Network();
 var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
 var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var sources = {};
    var last;
    var source;
    var balanser;
 var initialized;
    var balanser_timer;
    var images = [];
    var number_of_requests = 0;
    var number_of_requests_timer;
    var life_wait_times = 0;
    var life_wait_timer;
 var filter_sources = {};
    var filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice'),
      source: Lampa.Lang.translate('settings_rest_source')
    };
 var filter_find = {
      season: [],
      voice: []
    };
 if (balansers_with_search == undefined) {
      network.timeout(10000);
 network.silent(account('https://rc.bwa.to/lite/withsearch'), function(json) {
        balansers_with_search = json;
      }, function() {
		  balansers_with_search = [];
	  });
 }
	
    function balanserName(j) {
      var bals = j.balanser;
 var name = j.name.split(' ')[0];
      return (bals || name).toLowerCase();
    }
	
	function clarificationSearchAdd(value){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
 var all = Lampa.Storage.get('clarification_search','{}');
		
		all[id] = value;
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchDelete(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
 var all = Lampa.Storage.get('clarification_search','{}');
		
		delete all[id];
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchGet(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
 return all[id];
	}
	
    this.initialize = function() {
      var _this = this;
      this.loading(true);
 filter.onSearch = function(value) {
		  
		clarificationSearchAdd(value);
		
        Lampa.Activity.replace({
          search: value,
          clarification: true,
          similar: true
        });
 };
      filter.onBack = function() {
        _this.start();
      };
 filter.render().find('.selector').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      filter.render().find('.filter--search').appendTo(filter.render().find('.torrent-filter'));
 filter.onSelect = function(type, a, b) {
        if (type == 'filter') {
          if (a.reset) {
			  clarificationSearchDelete();
 _this.replaceChoice({
              season: 0,
              voice: 0,
              voice_url: '',
              voice_name: ''
            });
 setTimeout(function() {
              Lampa.Select.close();
              Lampa.Activity.replace({
				  clarification: 0,
				  similar: 0
			  });
            }, 10);
 } else {
            var url = filter_find[a.stype][b.index].url;
 var choice = _this.getChoice();
            if (a.stype == 'voice') {
              choice.voice_name = filter_find.voice[b.index].title;
 choice.voice_url = url;
            }
            choice[a.stype] = b.index;
            _this.saveChoice(choice);
            _this.reset();
 _this.request(url);
            setTimeout(Lampa.Select.close, 10);
          }
        } else if (type == 'sort') {
          Lampa.Select.close();
 object.lampac_custom_select = a.source;
          _this.changeBalanser(a.source);
        }
      };
      if (filter.addButtonBack) filter.addButtonBack();
      filter.render().find('.filter--sort span').text(Lampa.Lang.translate('lampac_balanser'));
      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
 scroll.body().append(Lampa.Template.get('lampac_content_loading'));
      Lampa.Controller.enable('content');
      this.loading(false);
	  if(object.balanser){
		  files.render().find('.filter--search').remove();
		  sources = {};
		  sources[object.balanser] = {name: object.balanser};
		  balanser = object.balanser;
		  filter_sources = [];
 return network["native"](account(object.url.replace('rjson=','nojson=')), this.parse.bind(this), function(){
			  files.render().find('.torrent-filter').remove();
			  _this.empty();
		  }, false, {
            dataType: 'text'
		  });
 } 
      this.externalids().then(function() {
        return _this.createSource();
      }).then(function(json) {
        if (!balansers_with_search.find(function(b) {
            return balanser.slice(0, b.length) == b;
          })) {
          filter.render().find('.filter--search').addClass('hide');
        }
        _this.search();
      })["catch"](function(e) {
      
   _this.noConnectToServer(e);
      });
    };
 this.rch = function(json, noreset) {
      var _this2 = this;
 rchRun(json, function() {
        if (!noreset) _this2.find();
        else noreset();
	  });
 };
    this.externalids = function() {
      return new Promise(function(resolve, reject) {
        if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
          var query = [];
          query.push('id=' + encodeURIComponent(object.movie.id));
          query.push('serial=' + (object.movie.name ? 1 : 0));
          if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
          if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
 
          var url = Defined.localhost + 'externalids?' + query.join('&');
          network.timeout(10000);
          network.silent(account(url), function(json) {
            for (var name in json) {
              object.movie[name] = json[name];
            }
            resolve();
     
       }, function() {
            resolve();
          });
        } else resolve();
      });
 };
    this.updateBalanser = function(balanser_name) {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      last_select_balanser[object.movie.id] = balanser_name;
 Lampa.Storage.set('online_last_balanser', last_select_balanser);
    };
    this.changeBalanser = function(balanser_name) {
      this.updateBalanser(balanser_name);
      Lampa.Storage.set('online_balanser', balanser_name);
      var to = this.getChoice(balanser_name);
 var from = this.getChoice();
      if (from.voice_name) to.voice_name = from.voice_name;
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };
 this.requestParams = function(url) {
      var query = [];
      var card_source = object.movie.source || 'tmdb';
 //Lampa.Storage.field('source')
      query.push('id=' + encodeURIComponent(object.movie.id));
      if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
 if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
	  if (object.movie.tmdb_id) query.push('tmdb_id=' + (object.movie.tmdb_id || ''));
 query.push('title=' + encodeURIComponent(object.clarification ? object.search : object.movie.title || object.movie.name));
      query.push('original_title=' + encodeURIComponent(object.movie.original_title || object.movie.original_name));
 query.push('serial=' + (object.movie.name ? 1 : 0));
      query.push('original_language=' + (object.movie.original_language || ''));
 query.push('year=' + ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4));
      query.push('source=' + card_source);
      query.push('clarification=' + (object.clarification ? 1 : 0));
 query.push('similar=' + (object.similar ? true : false));
      query.push('rchtype=' + (((window.rch_nws && window.rch_nws[hostkey]) ? window.rch_nws[hostkey].type : (window.rch && window.rch[hostkey]) ? window.rch[hostkey].type : '') || ''));
 if (Lampa.Storage.get('account_email', '')) query.push('cub_id=' + Lampa.Utils.hash(Lampa.Storage.get('account_email', '')));
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&');
    };
 this.getLastChoiceBalanser = function() {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
 if (last_select_balanser[object.movie.id]) {
        return last_select_balanser[object.movie.id];
 } else {
        return Lampa.Storage.get('online_balanser', filter_sources.length ? filter_sources[0] : '');
 }
    };
    this.startSource = function(json) {
      return new Promise(function(resolve, reject) {
        json.forEach(function(j) {
          var name = balanserName(j);
          sources[name] = {
            url: j.url,
            name: j.name,
            show: typeof j.show == 'undefined' ? true : j.show
  
         };
        });
        filter_sources = Lampa.Arrays.getKeys(sources);
        if (filter_sources.length) {
          var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
          if (last_select_balanser[object.movie.id]) {
            balanser = last_select_balanser[object.movie.id];
          } else {
           
 balanser = Lampa.Storage.get('online_balanser', filter_sources[0]);
          }
          if (!sources[balanser]) balanser = filter_sources[0];
          if (!sources[balanser].show && !object.lampac_custom_select) balanser = filter_sources[0];
          source = sources[balanser].url;
          Lampa.Storage.set('active_balanser', balanser);
 resolve(json);
        } else {
          reject();
 }
      });
    };
    this.lifeSource = function() {
      var _this3 = this;
 return new Promise(function(resolve, reject) {
        var url = _this3.requestParams(Defined.localhost + 'lifeevents?memkey=' + (_this3.memkey || ''));
        var red = false;
        var gou = function gou(json, any) {
          if (json.accsdb) return reject(json);
          var last_balanser = _this3.getLastChoiceBalanser();
          if (!red) {
            var _filter = json.online.filter(function(c) 
 {
              return any ? c.show : c.show && c.name.toLowerCase() == last_balanser;
            });
            if (_filter.length) {
              red = true;
              resolve(json.online.filter(function(c) {
                return c.show;
   
            }));
            } else if (any) {
              reject();
            }
          }
        };
        var fin = function fin(call) {
          network.timeout(3000);
      
     network.silent(account(url), function(json) {
            life_wait_times++;
            filter_sources = [];
            sources = {};
 json.online.forEach(function(j) {
              var name = balanserName(j);
              sources[name] = {
                url: j.url,
                name: j.name,
                show: typeof j.show == 'undefined' ? true : j.show
        
       };
            });
 filter_sources = Lampa.Arrays.getKeys(sources);
            filter.set('sort', filter_sources.map(function(e) {
              return {
                title: sources[e].name,
                source: e,
                selected: e == balanser,
                ghost: !sources[e].show
          
     };
            }));
 filter.chosen('sort', [sources[balanser] ? sources[balanser].name : balanser]);
            gou(json);
            var lastb = _this3.getLastChoiceBalanser();
 if (life_wait_times > 15 || json.ready) {
              filter.render().find('.lampac-balanser-loader').remove();
 gou(json, true);
            } else if (!red && sources[lastb] && sources[lastb].show) {
              gou(json, true);
 life_wait_timer = setTimeout(fin, 1000);
            } else {
              life_wait_timer = setTimeout(fin, 1000);
 }
          }, function() {
            life_wait_times++;
 if (life_wait_times > 15) {
              reject();
 } else {
              life_wait_timer = setTimeout(fin, 1000);
 }
          });
        };
        fin();
      });
    };
 this.createSource = function() {
      var _this4 = this;
 return new Promise(function(resolve, reject) {
        var url = _this4.requestParams(Defined.localhost + 'lite/events?life=true');
        network.timeout(15000);
        network.silent(account(url), function(json) {
          if (json.accsdb) return reject(json);
          if (json.life) {
			_this4.memkey = json.memkey;
			if (json.title) {
              if (object.movie.name) object.movie.name = json.title;
              if (object.movie.title) object.movie.title = 
 json.title;
			}
            filter.render().find('.filter--sort').append('<span class="lampac-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>');
            _this4.lifeSource().then(_this4.startSource).then(resolve)["catch"](reject);
          } else {
            _this4.startSource(json).then(resolve)["catch"](reject);
          }
        }, reject);
      });
 };
    /**
     * Подготовка
     */
    this.create = function() {
      return this.render();
 };
    /**
     * Начать поиск
     */
    this.search = function() { //this.loading(true)
      this.filter({
        source: filter_sources
      }, this.getChoice());
 this.find();
    };
    this.find = function() {
      this.request(this.requestParams(source));
    };
 this.request = function(url) {
      number_of_requests++;
 if (number_of_requests < 10) {
        network["native"](account(url), this.parse.bind(this), this.doesNotAnswer.bind(this), false, {
          dataType: 'text'
        });
 clearTimeout(number_of_requests_timer);
        number_of_requests_timer = setTimeout(function() {
          number_of_requests = 0;
        }, 4000);
 } else this.empty();
    };
    this.parseJsonDate = function(str, name) {
      try {
        var html = $('<div>' + str + '</div>');
 var elems = [];
        html.find(name).each(function() {
          var item = $(this);
          var data = JSON.parse(item.attr('data-json'));
          var season = item.attr('s');
          var episode = item.attr('e');
          var text = item.text();
          if (!object.movie.name) {
            if (text.match(/\d+p/i)) {
    
           if (!data.quality) {
                data.quality = {};
                data.quality[text] = data.url;
              }
              text = object.movie.title;
            }
          
   if (text == 'По умолчанию') {
              text = object.movie.title;
            }
          }
          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass('active');
 
          elems.push(data);
        });
        return elems;
 } catch (e) {
        return [];
      }
    };
 this.getFileUrl = function(file, call, waiting_rch) {
	  var _this = this;
 if(Lampa.Storage.field('player') !== 'inner' && file.stream && Lampa.Platform.is('apple')){
		  var newfile = Lampa.Arrays.clone(file);
		  newfile.method = 'play';
		  newfile.url = file.stream;
		  call(newfile, {});
 }
      else if (file.method == 'play') call(file, {});
 else {
        Lampa.Loading.start(function() {
          Lampa.Loading.stop();
          Lampa.Controller.toggle('content');
          network.clear();
        });
 network["native"](account(file.url), function(json) {
			if(json.rch){
				if(waiting_rch) {
					Lampa.Loading.stop();
					call(false, {});
				}
				else {
					_this.rch(json,function(){
						Lampa.Loading.stop();
						
						_this.getFileUrl(file, call, true);
					});
				}
			}
			else{
				Lampa.Loading.stop();
				call(json, json);
			}
        }, function() {
          Lampa.Loading.stop();
          call(false, {});
        });
 }
    };
    this.toPlayElement = function(file) {
      var play = {
        title: file.title,
        url: file.url,
        quality: file.qualitys,
        timeline: file.timeline,
        subtitles: file.subtitles,
		segments: file.segments,
        callback: file.mark,
		season: file.season,
		episode: file.episode,
		voice_name: file.voice_name
      };
 return play;
    };
    this.orUrlReserve = function(data) {
      if (data.url && typeof data.url == 'string' && data.url.indexOf(" or ") !== -1) {
        var urls = data.url.split(" or ");
 data.url = urls[0];
        data.url_reserve = urls[1];
      }
    };
 this.setDefaultQuality = function(data) {
      if (Lampa.Arrays.getKeys(data.quality).length) {
        for (var q in data.quality) {
          if (parseInt(q) == Lampa.Storage.field('video_quality_default')) {
            data.url = data.quality[q];
 this.orUrlReserve(data);
          }
          if (data.quality[q].indexOf(" or ") !== -1)
            data.quality[q] = data.quality[q].split(" or ")[0];
 }
      }
    };
 this.display = function(videos) {
      var _this5 = this;
 this.draw(videos, {
        onEnter: function onEnter(item, html) {
          _this5.getFileUrl(item, function(json, json_call) {
            if (json && json.url) {
              var playlist = [];
              var first = _this5.toPlayElement(item);
              first.url = json.url;
        
       first.headers = json_call.headers || json.headers;
              first.quality = json_call.quality || item.qualitys;
			  first.segments = json_call.segments || item.segments;
              first.hls_manifest_timeout = json_call.hls_manifest_timeout || json.hls_manifest_timeout;
              first.subtitles = json.subtitles;
			  first.subtitles_call = json_call.subtitles_call || json.subtitles_call;
			  if (json.vast && json.vast.url) {
                first.vast_url = json.vast.url;
  
               first.vast_msg = json.vast.msg;
                first.vast_region = json.vast.region;
                first.vast_platform = json.vast.platform;
                first.vast_screen = json.vast.screen;
 }
              _this5.orUrlReserve(first);
              _this5.setDefaultQuality(first);
 if (item.season) {
                videos.forEach(function(elem) {
                  var cell = _this5.toPlayElement(elem);
                  if (elem == item) cell.url = json.url;
                  else {
                 
    if (elem.method == 'call') {
                      if (Lampa.Storage.field('player') !== 'inner') {
                        cell.url = elem.stream;
						delete cell.quality;
                      } else {
                
         cell.url = function(call) {
                          _this5.getFileUrl(elem, function(stream, stream_json) {
                            if (stream.url) {
                              
 cell.url = stream.url;
                              cell.quality = stream_json.quality || elem.qualitys;
							  cell.segments = stream_json.segments || elem.segments;
                              cell.subtitles = stream.subtitles;
                          
     _this5.orUrlReserve(cell);
                              _this5.setDefaultQuality(cell);
 elem.mark();
                            } else {
                              cell.url = '';
 Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
                            }
                            call();
 }, function() {
                            cell.url = '';
 call();
                          });
                        };
                      }
                  
                      var element = first;
                      element.isonline = true;
                      
                      if (element.url && element.isonline) {
                        // online.js
                      } else if (element.url) {
                        if (false) {
                          if (Lampa.Platform.is('browser') && location.host.indexOf("127.0.0.1") !== -1) {
                            Lampa.Noty.show('Видео открыто в playerInner', {
                              time: 3000
                            });
                            $.get('https://rc.bwa.to/player-inner/' + element.url);
                            return;
                          }
                          Lampa.Player.play(element);
                        } else {
                          if (true && Lampa.Platform.is('browser') && location.host.indexOf("127.0.0.1") !== -1) Lampa.Noty.show('Внешний плеер можно указать в init.conf (playerInner)', {
                            time: 3000
                          });
                          Lampa.Player.play(element);
                        }
                      }
                      Lampa.Player.play(element);
                      Lampa.Player.playlist(playlist);
                      if (element.subtitles_call) _this5.loadSubtitles(element.subtitles_call);
                      item.mark();
                      _this5.updateBalanser(balanser);
                    } else {
                      Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
                    }
                  }
                });
              }
              
              var element = first;
              element.isonline = true;
              
              if (element.url && element.isonline) {
                // online.js
              } else if (element.url) {
                if (false) {
                  if (Lampa.Platform.is('browser') && location.host.indexOf("127.0.0.1") !== -1) {
                    Lampa.Noty.show('Видео открыто в playerInner', {
                      time: 3000
                    });
                    $.get('https://rc.bwa.to/player-inner/' + element.url);
                    return;
                  }
                  Lampa.Player.play(element);
                } else {
                  if (true && Lampa.Platform.is('browser') && location.host.indexOf("127.0.0.1") !== -1) Lampa.Noty.show('Внешний плеер можно указать в init.conf (playerInner)', {
                    time: 3000
                  });
                  Lampa.Player.play(element);
                }
              }
              
              Lampa.Player.play(element);
              Lampa.Player.playlist(playlist);
              if (element.subtitles_call) _this5.loadSubtitles(element.subtitles_call);
              item.mark();
              _this5.updateBalanser(balanser);
            } else {
              Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
            }
          }, true);
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          _this5.getFileUrl(item, function(stream) {
            call({
              file: stream.url,
              quality: item.qualitys
            });
          }, true);
        }
      });
      this.filter({
        season: filter_find.season.map(function(s) {
          return s.title;
        }),
        voice: filter_find.voice.map(function(b) {
          return b.title;
        })
      }, this.getChoice());
    };
    this.loadSubtitles = function(link) {
      network.silent(account(link), function(subs) {
        Lampa.Player.subtitles(subs);
      });
    };
    this.parse = function(str) {
      var json = Lampa.Arrays.decodeJson(str, {});
      this.loading(false);
      var items = json.items || [];
      var seasons = json.seasons || [];
      var voices = json.voices || [];
      var similars = json.similars || [];
      var params = json.params || {};

      if (json.rch) {
        return this.rch(json);
      }
      
      if (similars.length) {
        return this.similars(similars);
      }
      
      if (items.length) {
        var first = items[0];
        
        if (first.season) {
          if (seasons.length) {
            filter_find.season = seasons.map(function(e) {
              return {
                title: e.text,
                url: e.url,
                season: e.season
              };
            });
            
            var select_season = this.getChoice(balanser).season;
            var season = filter_find.season[select_season];
            
            if (!season) season = filter_find.season[0];
            
            if (voices.length) {
              filter_find.voice = voices.map(function(e) {
                return {
                  title: e.text,
                  url: e.url,
                  voice: e.voice
                };
              });
              
              var select_voice = this.getChoice(balanser).voice;
              var voice = filter_find.voice[select_voice];
              
              if (!voice) voice = filter_find.voice[0];
              
              if (this.getChoice().voice_url !== voice.url) {
                this.request(voice.url);
                return;
              }
            }
            
            if (this.getChoice().season !== season.season) {
              this.request(season.url);
              return;
            }
          }
        }
        
        this.display(items);
      } else {
        if (seasons.length) {
          filter_find.season = seasons.map(function(e) {
            return {
              title: e.text,
              url: e.url,
              season: e.season
            };
          });
          
          var select_season = this.getChoice(balanser).season;
          var season = filter_find.season[select_season];
          
          if (!season) season = filter_find.season[0];
          
          if (voices.length) {
            filter_find.voice = voices.map(function(e) {
              return {
                title: e.text,
                url: e.url,
                voice: e.voice
              };
            });
            
            var select_voice = this.getChoice(balanser).voice;
            var voice = filter_find.voice[select_voice];
            
            if (!voice) voice = filter_find.voice[0];
            
            if (this.getChoice().voice_url !== voice.url) {
              this.request(voice.url);
              return;
            }
          }
          
          var select_season = this.getChoice(balanser).season;
          var season = filter_find.season[select_season];
          
          if (!season) season = filter_find.season[0];
          
          //console.log('Lampac', 'go to season', season);
          this.request(season.url);
        } else {
          this.doesNotAnswer(json);
        }
      }
    };
    this.similars = function(json) {
      var _this6 = this;
      scroll.clear();
      json.forEach(function(elem) {
        elem.title = elem.text;
        elem.info = '';
        var info = [];
        var year = ((elem.start_date || elem.year || object.movie.release_date || object.movie.first_air_date || '') + '').slice(0, 4);
        if (year) info.push(year);
        if (elem.details) info.push(elem.details);
        var name = elem.title || elem.text;
        elem.title = name;
        elem.time = elem.time || '';
        elem.info = info.join('<span class="online-prestige-split">●</span>');
        var item = Lampa.Template.get('lampac_prestige_folder', elem);
        
        if (elem.img) {
          var image = $('<img style="height: 7em; width: 7em; border-radius: 0.3em;"/>');
          item.find('.online-prestige__folder').empty().append(image);
          
          if (elem.img !== undefined) {
            if (elem.img.charAt(0) === '/') elem.img = Defined.localhost + elem.img.substring(1);
            if (elem.img.indexOf('/proxyimg') !== -1) elem.img = account(elem.img); 
          }
          Lampa.Utils.imgLoad(image, elem.img);
        }
        
        item.on('hover:enter', function() {
          _this6.reset();
          _this6.request(elem.url);
        }).on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        
        scroll.append(item);
      });
      Lampa.Controller.enable('content');
      this.loading(false);
    };
    this.filter = function(filter_items, choice) {
      var select = [];
      var add = function add(type, title) {
        var items = filter_find[type].map(function(e) {
          return e.title;
        });
        var value = choice[type];
        
        var subitems = items.map(function(name, i) {
          return {
            title: name,
            selected: value == i,
            index: i
          };
        });
        
        select.push({
          title: title,
          subtitle: items[value],
          items: subitems,
          stype: type
        });
      };
      
      filter_items.source = filter_sources;
      select.push({
        title: Lampa.Lang.translate('torrent_parser_reset'),
        reset: true
      });
      
      this.saveChoice(choice);
      
      if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
      if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
      
      filter.set('filter', select);
      filter.set('sort', filter_sources.map(function(e) {
        return {
          title: sources[e].name,
          source: e,
          selected: e == balanser,
          ghost: !sources[e].show
        };
      }));
      
      this.selected(filter_items);
    };
    this.selected = function(filter_items) {
      var need = this.getChoice(),
        select = [];
      
      for (var i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i == 'voice') {
            select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
          } else if (i !== 'source') {
            if (filter_items.season.length >= 1) {
              select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
            }
          }
        }
      }
      
      filter.chosen('filter', select);
      filter.chosen('sort', [sources[balanser].name]);
    };
    this.getEpisodes = function(season, call) {
      var episodes = [];
      var tmdb_id = object.movie.id;
      
      if (['cub', 'tmdb'].indexOf(object.movie.source || 'tmdb') == -1) tmdb_id = object.movie.tmdb_id;
      
      if (typeof tmdb_id == 'number' && object.movie.name) {
        Lampa.Api.tmdb.get('tv/' + tmdb_id + '/season/' + season + '/videos', {
          language: Lampa.Lang.code()
        }, function(json) {
          if (json.results) {
            episodes = json.results.map(function(e) {
              return {
                title: e.name,
                url: e.key
              };
            });
          }
          call(episodes);
        }, function() {
          call(episodes);
        });
      } else call(episodes);
    };
    this.draw = function(items, params) {
      var _this7 = this;
      
      var choice = this.getChoice();
      var serial = object.movie.name;
      var scroll_to_mark;
      var scroll_to_element;
      
      scroll.clear();
      
      items.forEach(function(element, index) {
        var _this8 = _this7;
        
        var episode;
        var episodes = params.episodes;
        
        if (episodes && episodes.length) {
          episode = episodes.find(function(e) {
            return e.episode_number == element.episode;
          });
        }
        
        var episode_num = element.episode || index + 1;
        var episode_last = choice.episodes_view[element.season];
        var voice_name = choice.voice_name || (filter_find.voice[0] ? filter_find.voice[0].title : false) || element.voice_name || (serial ? 'Неизвестно' : element.text) || 'Неизвестно';
        
        if (element.quality) {
          element.qualitys = element.quality;
          element.quality = Lampa.Arrays.getKeys(element.quality)[0];
        }
        
        Lampa.Arrays.extend(element, {
          voice_name: voice_name,
          info: voice_name.length > 60 ? voice_name.substr(0, 60) + '...' : voice_name,
          quality: '',
          time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true)
        });
        
        var hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title, element.voice_name].join('') : object.movie.original_title + element.voice_name);
        
        var data = {
          hash_timeline: hash_timeline,
          hash_behold: hash_behold
        };
        var info = [];
        
        if (element.season) {
          element.translate_episode_end = _this8.getLastEpisode(items);
          element.translate_voice = element.voice_name;
        }
        
        if (element.text && !episode) element.title = element.text;
        element.timeline = Lampa.Timeline.view(hash_timeline);
        
        if (episode) {
          element.title = episode.name;
          if (element.info.length < 30) info.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + element.season + (element.episode ? ', ' + Lampa.Lang.translate('torrent_serial_episode') + ' ' + element.episode : ''));
        }
        
        if (element.timeline.percent) info.push(Lampa.Lang.translate('time_viewed') + ' ' + Lampa.Utils.secondsToTime(element.timeline.time));
        
        element.info = info.join('<span class="online-prestige-split">●</span>');
        
        var html = Lampa.Template.get('lampac_prestige', element);
        
        var img_url = element.img || (episode ? episode.still_path : object.movie.backdrop_path) ? Lampa.Utils.TMDB.image(element.img || (episode ? episode.still_path : object.movie.backdrop_path), 'w500') : '';
        
        if (img_url) {
          var image = html.find('img');
          Lampa.Utils.imgLoad(image, img_url);
        }
        
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        
        if (viewed.indexOf(hash_behold) !== -1) {
          html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
          scroll_to_mark = html;
        }
        
        if (serial && episode_last && episode_last == episode_num) scroll_to_element = html;
        
        element.mark = function() {
          var viewed = Lampa.Storage.cache('online_view', 5000, []);
          
          if (viewed.indexOf(hash_behold) == -1) {
            viewed.push(hash_behold);
            Lampa.Storage.set('online_view', viewed);
            
            if (html.find('.online-prestige__viewed').length == 0) {
              html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
            }
          }
          
          choice = _this8.getChoice();
          
          if (!serial) {
            choice.movie_view = hash_behold;
          } else {
            choice.episodes_view[element.season] = episode_num;
          }
          
          _this8.saveChoice(choice);
          
          var voice_name_text = choice.voice_name || element.voice_name || element.title;
          
          if (voice_name_text.length > 30) voice_name_text = voice_name_text.slice(0, 30) + '...';
          
          _this8.watched({
            balanser: balanser,
            balanser_name: Lampa.Utils.capitalizeFirstLetter(sources[balanser] ? sources[balanser].name.split(' ')[0] : balanser),
            voice_id: choice.voice_id,
            voice_name: voice_name_text,
            episode: element.episode,
            season: element.season
          });
        };
        
        element.unmark = function() {
          viewed = Lampa.Storage.cache('online_view', 5000, []);
          
          if (viewed.indexOf(hash_behold) !== -1) {
            Lampa.Arrays.remove(viewed, hash_behold);
            Lampa.Storage.set('online_view', viewed);
            Lampa.Storage.remove('online_view', hash_behold);
            html.find('.online-prestige__viewed').remove();
          }
        };
        
        element.timeclear = function() {
          element.timeline.percent = 0;
          element.timeline.time = 0;
          element.timeline.duration = 0;
          Lampa.Timeline.update(element.timeline);
        };
        
        html.on('hover:enter', function() {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          if (params.onEnter) params.onEnter(element, html, data);
        }).on('hover:focus', function(e) {
          last = e.target;
          if (params.onFocus) params.onFocus(element, html, data);
          scroll.update($(e.target), true);
        });
        
        if (params.onRender) params.onRender(element, html, data);
        
        _this8.contextMenu({
          html: html,
          element: element,
          onFile: function onFile(call) {
            _this8.getFileUrl(element, function(stream) {
              call({
                file: stream.url,
                quality: element.qualitys
              });
            }, true);
          }
        });
        
        html.css('opacity', '0.5');
        scroll.append(html);
      });
      
      if (scroll_to_element) {
        last = scroll_to_element[0];
      } else if (scroll_to_mark) {
        last = scroll_to_mark[0];
      }
      
      Lampa.Controller.enable('content');
    };
    this.contextMenu = function(params) {
      params.html.on('hover:long', function() {
        function show(extra) {
          var enabled = Lampa.Controller.enabled().name;
          var menu = [];
          
          if (Lampa.Platform.is('webos')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Webos',
              player: 'webos'
            });
          }
          
          if (Lampa.Platform.is('android')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Android',
              player: 'android'
            });
          }
          
          menu.push({
            title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
            player: 'lampa'
          });
          
          menu.push({
            title: Lampa.Lang.translate('lampac_video'),
            separator: true
          });
          
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_title'),
            mark: true
          });
          
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
            unmark: true
          });
          
          menu.push({
            title: Lampa.Lang.translate('time_reset'),
            timeclear: true
          });
          
          if (extra) {
            menu.push({
              title: Lampa.Lang.translate('copy_link'),
              copylink: true
            });
          }
          
          if (window.lampac_online_context_menu) window.lampac_online_context_menu.push(menu, extra, params);
          
          menu.push({
            title: Lampa.Lang.translate('more'),
            separator: true
          });
          
          if (Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice) {
            menu.push({
              title: Lampa.Lang.translate('lampac_voice_subscribe'),
              subscribe: true
            });
          }
          
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_marks'),
            clearallmark: true
          });
          
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_timecodes'),
            timeclearall: true
          });
          
          Lampa.Select.show({
            title: Lampa.Lang.translate('title_online'),
            items: menu,
            onSelect: function onSelect(a) {
              if (a.mark) params.element.mark();
              else if (a.unmark) params.element.unmark();
              else if (a.timeclear) params.element.timeclear();
              else if (a.player) Lampa.Player.run(a.player);
              else if (a.subscribe) {
                var network = new Network();
                network.silent(account(Defined.localhost + 'voice/subscribe'), function(json) {
                  Lampa.Noty.show(json.success ? Lampa.Lang.translate('lampac_voice_success') : Lampa.Lang.translate('lampac_voice_error'));
                });
              } else if (a.clearallmark) {
                Lampa.Storage.set('online_view', []);
                Lampa.Storage.remove('online_view');
                Lampa.Noty.show(Lampa.Lang.translate('settings_clear_cache_success'));
              } else if (a.timeclearall) {
                Lampa.Timeline.clear();
                Lampa.Noty.show(Lampa.Lang.translate('settings_clear_cache_success'));
              } else if (a.copylink) {
                if (Lampa.Platform.is('android')) {
                  AndroidJS.copy(extra.file);
                } else if (Lampa.Platform.is('webos')) {
                  webOS.service.request('luna://com.webos.service.clipboard', {
                    method: 'copy',
                    parameters: {
                      text: extra.file
                    },
                    onSuccess: function onSuccess() {
                      Lampa.Noty.show(Lampa.Lang.translate('copy_link_success'));
                    },
                    onFailure: function onFailure() {
                      Lampa.Noty.show(Lampa.Lang.translate('copy_link_failed'));
                    }
                  });
                }
                Lampa.Noty.show(Lampa.Lang.translate('copy_link_success'));
              }
            }
          });
        }
        
        if (params.onContextMenu) {
          params.onContextMenu(params.element, params.html, params.data, show);
        } else {
          params.onFile(function(extra) {
            show(extra);
          });
        }
      });
    };
    this.doesNotAnswer = function(er) {
      var _this9 = this;
      
      var html = Lampa.Template.get('online_empty', {
        title: Lampa.Lang.translate('lampac_balanser_dont_work'),
        text: Lampa.Lang.translate('lampac_balanser_timeout')
      });
      
      html.find('.online-empty__button').append('<span class="selector change">' + Lampa.Lang.translate('lampac_change_balanser') + '</span>');
      html.find('.online-empty__title').text(Lampa.Lang.translate('lampac_balanser_dont_work'));
      
      if (er && er.accsdb) html.find('.online-empty__title').html(er.msg);
      
      var tic = er && er.accsdb ? 10 : 5;
      
      html.find('.cancel').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      
      html.find('.change').on('hover:enter', function() {
        clearInterval(balanser_timer);
        filter.render().find('.filter--sort').trigger('hover:enter');
      });
      
      scroll.clear();
      scroll.append(html);
      this.loading(false);
      
      balanser_timer = setInterval(function() {
        tic--;
        html.find('.timeout').text(tic);
        
        if (tic == 0) {
          clearInterval(balanser_timer);
          var keys = Lampa.Arrays.getKeys(sources);
          var indx = keys.indexOf(balanser);
          var next = keys[indx + 1];
          
          if (!next) next = keys[0];
          
          balanser = next;
          
          if (Lampa.Activity.active().activity == _this9.activity) _this9.changeBalanser(balanser);
        }
      }, 1000);
    };
    this.getLastEpisode = function(items) {
      var last_episode = 0;
      
      items.forEach(function(e) {
        if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode));
      });
      
      return last_episode;
    };
    this.start = function() {
      if (Lampa.Activity.active().activity !== this.activity) return;
      
      if (!initialized) {
        initialized = true;
        this.initialize();
      }
      
      Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
      
      Lampa.Controller.add('content', {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        gone: function gone() {
          clearTimeout(balanser_timer);
        },
        up: function up() {
          if (Lampa.Navigator.canmove('up')) {
            Lampa.Navigator.move('up');
          } else {
            Lampa.Controller.toggle('menu');
          }
        },
        down: function down() {
          Lampa.Navigator.move('down');
        },
        right: function right() {
          if (Lampa.Navigator.canmove('right')) Lampa.Navigator.move('right');
          else Lampa.Controller.toggle('full');
        },
        left: function left() {
          if (Lampa.Navigator.canmove('left')) Lampa.Navigator.move('left');
          else Lampa.Controller.toggle('menu');
        },
        back: function back() {
          Lampa.Activity.backward();
        }
      });
      
      Lampa.Controller.toggle('content');
    };
    
    this.watched = function(data) {
      var views = Lampa.Storage.cache('online_views', 100, []);
      var find = views.find(function(a) {
        return a.id == object.movie.id;
      });
      
      if (!find) {
        find = {
          id: object.movie.id,
          views: []
        };
        views.push(find);
        Lampa.Storage.set('online_views', views);
      }
      
      var balanser_view = find.views.find(function(a) {
        return a.balanser == data.balanser;
      });
      
      if (!balanser_view) {
        balanser_view = {
          balanser: data.balanser,
          balanser_name: data.balanser_name,
          views: []
        };
        find.views.push(balanser_view);
      }
      
      var voice_view = balanser_view.views.find(function(a) {
        return a.voice_id == data.voice_id;
      });
      
      if (!voice_view) {
        voice_view = {
          voice_id: data.voice_id,
          voice_name: data.voice_name,
          views: []
        };
        balanser_view.views.push(voice_view);
      }
      
      var episode_view = voice_view.views.find(function(a) {
        return a.season == data.season && a.episode == data.episode;
      });
      
      if (!episode_view) {
        episode_view = {
          season: data.season,
          episode: data.episode
        };
        voice_view.views.push(episode_view);
      }
      
      Lampa.Storage.set('online_views', views);
    };
    
    this.getChoice = function(balanser) {
      var choise_list = Lampa.Storage.cache('online_choise', 5000, {});
      var balanser_name = balanser || this.getLastChoiceBalanser();
      
      if (!choise_list[object.movie.id]) {
        choise_list[object.movie.id] = {};
        Lampa.Storage.set('online_choise', choise_list);
      }
      
      if (!choise_list[object.movie.id][balanser_name]) {
        choise_list[object.movie.id][balanser_name] = {
          season: 0,
          voice: 0,
          movie_view: '',
          episodes_view: {}
        };
        Lampa.Storage.set('online_choise', choise_list);
      }
      
      return choise_list[object.movie.id][balanser_name];
    };
    
    this.saveChoice = function(choice, balanser) {
      var choise_list = Lampa.Storage.cache('online_choise', 5000, {});
      var balanser_name = balanser || this.getLastChoiceBalanser();
      choise_list[object.movie.id][balanser_name] = choice;
      Lampa.Storage.set('online_choise', choise_list);
    };
    
    this.replaceChoice = function(choice) {
      var choise_list = Lampa.Storage.cache('online_choise', 5000, {});
      choise_list[object.movie.id] = {};
      Lampa.Storage.set('online_choise', choise_list);
      
      var balanser_name = this.getLastChoiceBalanser();
      choise_list[object.movie.id][balanser_name] = choice;
      Lampa.Storage.set('online_choise', choise_list);
    };
    
    this.reset = function() {
      scroll.clear();
      this.loading(true);
      
      filter_find = {
        season: [],
        voice: []
      };
      
      last = false;
    };
    
    this.render = function() {
      return files.render();
    };
    
    this.loading = function(status) {
      if (status) Lampa.Template.get('lampac_content_loading').appendTo(files.render());
      else files.render().find('.lampac-content-loading').remove();
    };
    
    this.empty = function() {
      scroll.clear();
      files.render().find('.torrent-filter').remove();
      files.render().find('.explorer__files').append(Lampa.Template.get('online_empty', {
        title: Lampa.Lang.translate('lampac_does_not_answer_text')
      }));
      this.loading(false);
    };
  }
  
  function addSearch() {
    var network = new Network();
    
    var searchComplite = function searchComplite(json) {
      var items = json.items || [];
      var results = items.map(function(elem) {
        elem.title = elem.text;
        elem.info = '';
        var info = [];
        var year = ((elem.start_date || elem.year || object.movie.release_date || object.movie.first_air_date || '') + '').slice(0, 4);
        if (year) info.push(year);
        if (elem.details) info.push(elem.details);
        elem.info = info.join('<span class="online-prestige-split">●</span>');
        
        return elem;
      });
      
      oncomplite(results);
    };
    
    var source = {
      name: Lampa.Lang.translate('title_online') + ' - Lampac',
      onSearch: function onSearch(params, oncomplite) {
        var spiderUri = Lampa.Storage.get('online_search_view_type', 'search');
        
        network.silent(account(Defined.localhost + 'lite/' + spiderUri + '?title=' + params.query), function(json) {
          
          if (json.rch) {
            window.rch_nws[hostkey].typeInvoke('https://rc.bwa.to', function() {
              network.silent(account(Defined.localhost + 'lite/' + spiderUri + '?title=' + params.query), function(links) {
                searchComplite(links);
              }, function() {
                oncomplite([]);
              });
            });
          } else {
            searchComplite(json);
          }
        }, function() {
          oncomplite([]);
        });
      },
      onCancel: function() {
        network.clear();
      },
      params: {
        lazy: true,
        align_left: true,
        card_events: {
          onMenu: function() {}
        }
      },
      onMore: function(params, close) {
        close();
      },
      onSelect: function(params, close) {
        close();
        
        Lampa.Activity.push({
          url: params.element.url,
          title: 'Lampac - ' + params.element.title,
          component: 'bwarch',
          movie: params.element,
          page: 1,
          search: params.element.title,
          clarification: true,
          balanser: params.element.balanser,
          noinfo: true
        });
      }
    };
    Lampa.Search.addSource(source);
  }
  
  function resetTemplates() {
    Lampa.Template.add('lampac_css', "\n <style>\n @charset 'UTF-8';.online-prestige{position:relative;-webkit-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-prestige__body{padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}@media screen and (max-width:480px){.online-prestige__body{padding:.8em 1.2em}}.online-prestige__img{position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}.online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.online-prestige__img--loaded>img{opacity:1}@media screen and (max-width:480px){.online-prestige__img{width:7em;min-height:6em}}.online-prestige__folder{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}.online-prestige__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online-prestige__viewed>svg{width:1.5em !important;height:1.5em !important}.online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}.online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;-webkit-background-size:contain;-o-background-size:contain;background-size:contain}\n </style>\n");
    Lampa.Template.add('lampac_prestige', "<div class=\"online-prestige selector\">\n <div class=\"online-prestige__img\">\n <img src=\"\" />\n </div>\n <div class=\"online-prestige__body\">\n <div class=\"online-prestige__head\">\n <div class=\"online-prestige__title\">{title}</div>\n <div class=\"online-prestige__time\">{time}</div>\n </div>\n\n <div class=\"online-prestige__footer\">\n <div class=\"online-prestige__info\">{info}</div>\n </div>\n </div>\n </div>");
    Lampa.Template.add('lampac_prestige_folder', "<div class=\"online-prestige selector\">\n <div class=\"online-prestige__img online-prestige__folder\">\n <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path d=\"M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.89 20 3.99 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z\" fill=\"currentColor\"/>\n </svg>\n </div>\n <div class=\"online-prestige__body\">\n <div class=\"online-prestige__head\">\n <div class=\"online-prestige__title\">{title}</div>\n <div class=\"online-prestige__time\">{time}</div>\n </div>\n\n <div class=\"online-prestige__footer\">\n <div class=\"online-prestige__info\">{info}</div>\n </div>\n </div>\n </div>");
    Lampa.Template.add('lampac_prestige_watched', "<div class=\"online-prestige online-prestige-watched selector\">\n <div class=\"online-prestige-watched__icon\">\n <svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <circle cx=\"10.5\" cy=\"10.5\" r=\"9\" stroke=\"currentColor\" stroke-width=\"3\"/>\n <path d=\"M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z\" fill=\"currentColor\"/>\n </svg>\n </div>\n <div class=\"online-prestige-watched__body\">\n <div class=\"online-prestige-watched__title\">{title}</div>\n <div class=\"online-prestige-watched__clear\" data-type=\"clear\">\n <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path d=\"M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z\" fill=\"currentColor\"/>\n </svg>\n </div>\n </div>\n </div>");
    Lampa.Template.add('lampac_content_loading', "<div class=\"lampac-content-loading\"><div class=\"lampac-prestige-loader\"></div></div>");
  }
  
  function startPlugin() {
    window.bwarch_plugin = true;
    
    var manifst = {
      type: 'video',
      version: '1.6.4',
      name: 'BwaRC',
      description: 'Плагин для просмотра онлайн сериалов и фильмов',
      component: 'bwarch',
      onContextMenu: function onContextMenu(object) {
        return {
          name: Lampa.Lang.translate('lampac_watch'),
          description: ''
        };
      },
      onContextLauch: function onContextLauch(object) {
        resetTemplates();
        Lampa.Component.add('bwarch', component);
        
        var id = Lampa.Utils.hash(object.number_of_seasons ? object.original_name : object.original_title);
        var all = Lampa.Storage.get('clarification_search', '{}');
        
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'bwarch',
          search: all[id] ? all[id] : object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1,
          clarification: all[id] ? true : false
        });
      }
    };
    Lampa.Manifest.plugins = manifst;
    
    Lampa.Lang.add({
      lampac_watch: {
        uk: 'Дивитися онлайн'
      },
      lampac_video: {
        uk: 'Відео'
      },
      lampac_no_watch_history: {
        ua: 'Немає історії перегляду'
      },
      lampac_nolink: {
        uk: 'Неможливо отримати посилання'
      },
      lampac_balanser: {
        uk: 'Джерело'
      },
      helper_online_file: {
        uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню'
      },
      title_online: {
        uk: 'Онлайн'
      },
      lampac_voice_subscribe: {
        uk: 'Підписатися на переклад'
      },
      lampac_voice_success: {
        uk: 'Ви успішно підписалися'
      },
      lampac_voice_error: {
        uk: 'Виникла помилка'
      },
      lampac_clear_all_marks: {
        uk: 'Очистити всі мітки'
      },
      lampac_clear_all_timecodes: {
        uk: 'Очистити всі тайм-коди'
      },
      lampac_change_balanser: {
        uk: 'Змінити балансер'
      },
      lampac_balanser_dont_work: {
        uk: 'Пошук не дав результатів'
      },
      lampac_balanser_timeout: {
        uk: 'Джерело буде автоматично переключено через <span class="timeout">10</span> секунд.'
      },
      lampac_does_not_answer_text: {
        uk: 'Пошук не дав результатів'
      }
    });
  }
  
  function addButton(e) {
    if (e.render.length) {
      var btn = $('<a class="button view--torrent-lampac"><div class="button__body"><svg style="width:14px; height:14px; fill:#fff;" viewBox="0 0 512 512"><path d="M495.7,294.6l-84.3-15.6c-1.3-0.2-2.5,0.7-2.8,2L389.9,376c-0.2,1.3,0.7,2.5,2,2.8l84.3,15.6c1.3,0.2,2.5-0.7,2.8-2l18.7-97c0.2-1.3-0.7-2.5-2-2.8H495.7z"></path></svg><span>' + Defined.api.toUpperCase() + '</span></div></a>');
      
      btn.on('click', function() {
        Lampa.Api.popup.loading(true);
        Lampa.Utils.require({
          url: Defined.localhost + 'api.js'
        }).then(function(script) {
          Lampa.Api.popup.close();
          script.default(e.movie, {
            url: Defined.localhost,
            id: Lampa.Storage.get('lampac_unic_id', ''),
            android_version: getAndroidVersion(),
            apn: Defined.apn
          });
        })["catch"](function(err) {
          Lampa.Api.popup.close();
          Lampa.Api.popup.alert({
            title: Defined.api.toUpperCase(),
            text: Lampa.Lang.translate('error')
          });
        });
      });
      
      e.render.after(btn);
    }
  }
  
  Lampa.Listener.follow('full', function(e) {
    if (e.type == 'complite') {
      addButton({
        render: e.object.activity.render().find('.view--torrent'),
        movie: e.data.movie
      });
    }
  });
  
  try {
    if (Lampa.Activity.active().component == 'full') {
      addButton({
        render: Lampa.Activity.active().activity.render().find('.view--torrent'),
        movie: Lampa.Activity.active().card
      });
    }
  } catch (e) {}
  
  if (Lampa.Manifest.app_digital >= 177) {
    var balansers_sync = ["filmix", 'filmixtv', "fxapi", "rezka", "rhsprem", "lumex", "videodb", "collaps", "collaps-dash", "hdvb", "zetflix", "kodik", "ashdi", "kinoukr", "kinotochka", "remux", "iframevideo", "cdnmovies", "anilibria", "animedia", "animego", "animevost", "animebesst", "redheadsound", "alloha", "animelib", "moonanime", "kinopub", "vibix", "vdbmovies", "fancdn", "cdnvideohub", "vokino", "rc/filmix", "rc/fxapi", "rc/rhs", "vcdn"];
    Lampa.Streams.add_balancers(balansers_sync.map(function(n) {
      return 'rc/' + n;
    }));
  }
  
  Lampa.Utils.putScript(["https://rc.bwa.to/js/sockjs.min.js?v18112025", "https://rc.bwa.to/js/nws-client.js?v18112025"], function() {
    startPlugin();
    addSearch();
  });
  
})();
