
function refreshInit (url) {
    var page = 2;
    
	$('.ui-refresh').refresh({
        load: function (dir, type) {
            var me = this;
            
            $.ajax({
                url: url,
                data: {
                    page: page
                },
                dataType: 'jsonp',
                success: function (data) {

                    if(data.status){
                        var $list = $('.data-list'),
                            html = template('loadMore', data);

                        $list[dir == 'up' ? 'prepend' : 'append'](html);
                        me.afterDataLoading();    //数据加载完成后改变状态
                        $('.ui-refresh-down').find('span').html("");

                        page++;

                    }else{
                        me.disable(dir);
                    }


                }
                
            });
        }
    });

    $('.ui-refresh').removeAttr('style');

}

var setMask = {
    tpl: '<div class="ui-masks" style="-webkit-transition: all 0.5s; transition: all 0.5s;"></div>',
    init:function (maskContainer,closeCallback) {
        var self = this;
        var maskContainer = maskContainer || 'body';
        $(document).on('touchend', '.ui-masks', function (e) {
            self.close(closeCallback);
        })
    },
    open: function (maskContainer,fn) {
        var self = this;
        var wrap = maskContainer || 'body';
        
        var flag = $(wrap).find('.ui-masks').length;

        if(!flag) $(wrap).append(self.tpl);

        var $mask = self.mask = $(wrap).find('.ui-masks');

        // $(wrap).css('overflow','hidden');

        $mask.show();
        $mask.css({'opacity':0.5});

        if(typeof(fn) === 'function') fn();
        
    },
    close: function (fn) {
        var self = this;
        // var maskContainer = maskContainer || 'body';
        // var $mask = $(maskContainer).find('.ui-masks');
        self.mask.css({'opacity':0});
        setTimeout(function () {
            self.mask.hide().remove();
            
        },500)
        if(typeof(fn) === 'function') fn();
    }
}
function GetQueryString(name){

     var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
     var r = window.location.search.substr(1).match(reg);
     if(r!=null)return  unescape(r[2]); return "";

}

function scrollBar ($el, options) {
    var placeholder = $( '<div class="ui-toolbar-placeholder"></div>' ).height( $el.offset().height ).
        insertBefore( $el ).append( $el ).append( $el.clone().css({'z-index': 8, position: 'absolute',top: 0}) ),
        top = $el.offset().top,
        check = function() {
            document.body.scrollTop > top ? $el.css({position:'fixed', top: 0}) : $el.css('position', 'absolute');
        };

    $(window).on( 'touchmove touchend touchcancel scroll scrollStop', check );
    $(document).on( 'touchend touchcancel', offHandle = function() {
        setTimeout( function() {
            check();
        }, 200 );
    } );
}

function gotoTop(){

    $("#goTop").click(function(e){
        e.preventDefault();
        pageScroll();
        // $('html,body').animate({scrollTop:0},700);
    });
    //获取页面的最小高度，无传入值则默认为600像素
    var min_height = $(window).height();
    //为窗口的scroll事件绑定处理函数
    $(window).scroll(function(){
        //获取窗口的滚动条的垂直位置
        var s = $(window).scrollTop();
        //当窗口的滚动条的垂直位置大于页面的最小高度时，让返回顶部元素渐现，否则渐隐
        if( s > min_height*2){
            $("#goTop").css('display','inline-block');
        }else{
            $("#goTop").css('display','none');
        };
    });
};

function pageScroll(){
    //把内容滚动指定的像素数（第一个参数是向右滚动的像素数，第二个参数是向下滚动的像素数）
    window.scrollBy(0,-100);
    //延时递归调用，模拟滚动向上效果
    scrolldelay = setTimeout('pageScroll()',20);
    //获取scrollTop值，声明了DTD的标准网页取document.documentElement.scrollTop，否则取document.body.scrollTop；因为二者只有一个会生效，另一个就恒为0，所以取和值可以得到网页的真正的scrollTop值
    var sTop=document.documentElement.scrollTop+document.body.scrollTop;
    //判断当页面到达顶部，取消延时代码（否则页面滚动到顶部会无法再向下正常浏览页面）
    if(sTop<10) clearTimeout(scrolldelay);
}
function disableScroll (flag) {
    // if(flag){
    //     $('.mainpage').addClass('main-fixed');
    // }else{
    //     $('.mainpage').removeClass('main-fixed');
        
    // }
}
$(function () {

    window.scrollTo(0, 1);//收起地址栏

    gotoTop();

    $(document).on('touchend', '#goBack', function (e) {
        e.preventDefault();
        window.history.go(-1);
    });

    if($('#J_toolbar').length) scrollBar($('#J_toolbar'));


    if($('#panel').length){

    	$('#panel').panel({
            contentWrap: $('.mainpage')
        });

        $('#panel2').panel({
            contentWrap: $('.mainpage')
        });

        // var PANEL = new gmu.Panel($('#panel2'),{
        //     contentWrap: $('.mainpage')
        //     // setup: true
        // });
    	$('#push-right').on('touchend', function () {

            $('#panel').panel('toggle', 'overlay', 'right');
            
            setMask.open();
            disableScroll(1);
        });
        $('#panel').on('beforeclose', function (e) {
            setMask.close();
            disableScroll(0);
            
        })

        $('#filterPanel').on('click', function (e) {

            e.preventDefault();

            var hh = $('.filter-panel .header').height();

            var sh = $(window).height() - hh;

            $('#subPanelBox').css({
                    'height': sh,
                    'padding-top': 0,
                    'padding-bottom': 0
                }).iScroll();

            $('#panel2').panel({
                    contentWrap: $('.mainpage'),
                    scrollMode: 'fix',
                    // display: 'overlay',
                    swipeClose: false
                }).on('open', function () {
                    $('.panel').iScroll('refresh');
                }).panel('toggle', 'overlay');

             // $('#panel2').panel('toggle', 'overlay', 'right');
            
            setMask.open();
            
            disableScroll(1);

            
            
        });
        $('#panel2').on('beforeclose', function (e) {
            setMask.close();
            disableScroll(0);

            
        })
    }

    $("#slider").show();
    var gmuslider = new gmu.Slider($("#slider"),{
        loop: true,
        autoPlay: true,
        dots: true,
        arrow: false
    });

    var slideInter = setInterval(function () {
        $('#slider img').width('auto');
    },300);
    gmuslider.on('slide', function (index) {
        
        clearInterval(slideInter);

    });
    

    $('#nav').navigator({
        visibleCount: 5
    });


    // 筛选面板

    var $firstBox = $("#mainPanelBox"),
        areaValue = $('.J_areaValue').text(),
        cityValue = $('.J_cityValue').text(),
        rankValue = $('.J_rankValue').text(),
        subPanelParent;
        

    var initFilter = {

        init: function () {
            var self = this;
            
        },

        panelParent: function (argument) {
            
            

        },
        panelSub: function (argument) {
            
            

        }

    }

    var isSub = false;

    $firstBox.on('touchend', 'li', function (e) {

    	e.preventDefault();

    	$('.sp-wrap').css({
            '-webkit-transform': 'translate(-50%, 0px)',
            'transform': 'translate(-50%, 0px)'
        });

        isSub = true;

        subPanelParent = $(this).attr('data-type');

        $('#panelBack').html('<i class="i-back"></i>');

        $('.ui-panel .title').html($(this).find('.sl-item:first-child').text());

        var html = '';
        switch (subPanelParent){
                case 'J_areaValue':
                    for (var i = 0; i < area.length; i++) {
                        html += '<li data-value='+ area[i] +'><a href="#">' +
                                '<span class="sl-item">'+ area[i] +'</span>' +
                                '<span class="sl-item"></span>' +
                            '</a></li>';
                    };
                    $('#subPanelBox .sp-list').html(html);
                    // $('#subPanelBox li').removeClass('hover');
                    $('[data-value="'+ areaValue +'"]').addClass('hover');

                    break;
                case 'J_cityValue':

                    if(areaValue === '全部') {
                        $('#subPanelBox .sp-list').empty().html('<li>请先选择地区！</li>');
                        return;
                    };
                    for (var i = 0; i < city[areaValue].length; i++) {
                        html += '<li data-value='+ city[areaValue][i] +'><a href="#">' +
                                '<span class="sl-item">'+ city[areaValue][i] +'</span>' +
                                '<span class="sl-item"></span>' +
                            '</a></li>';
                    };
                    $('#subPanelBox .sp-list').html(html);
                    // $('#subPanelBox li').removeClass('hover');
                    $('[data-value="'+ cityValue +'"]').addClass('hover');

                    break;
                case 'J_rankValue':
                    for (var i = 0; i < rank.length; i++) {
                        html += '<li data-value='+ rank[i] +'><a href="#">' +
                                '<span class="sl-item">'+ rank[i] +'</span>' +
                                '<span class="sl-item"></span>' +
                            '</a></li>';
                    };
                    $('#subPanelBox .sp-list').html(html);
                    // $('#subPanelBox li').removeClass('hover');
                    $('[data-value="'+ rankValue +'"]').addClass('hover');

                    break;  
            }

    });

    $('#subPanelBox').on('click', 'li', function (e) {
        e.preventDefault();

        switch (subPanelParent){
            case 'J_areaValue':
                if(areaValue != $(this).attr('data-value')){
                    $('.J_cityValue').html('全部');
                }
                areaValue = $(this).attr('data-value');
                $('.'+subPanelParent).html(areaValue);
                break;
            case 'J_cityValue':
                cityValue = $(this).attr('data-value');
                $('.'+subPanelParent).html(cityValue);
                break;
            case 'J_rankValue':
                rankValue = $(this).attr('data-value');
                $('.'+subPanelParent).html(rankValue);
                break;
        }        
        $(this).addClass('hover').siblings().removeClass('hover');
        
        
    });

    $('#panelBack').on('click', function (e) {
        
        e.preventDefault();

        var marginLeft = $firstBox.css('marginLeft');

        if(!isSub) {

            setTimeout(function () {

                $('#filterPanel').trigger('click');

                disableScroll(0);
                
            },0)


            return;

        }

        $('.sp-wrap').css({
            '-webkit-transform': 'translate(0px, 0px)',
            'transform': 'translate(0px, 0px)'
        });

        $(this).html('取消');

        $('.ui-panel .title').html('筛选');

        isSub = false;
    });

    $('#panelSearch').on('click', function (e) {
        e.preventDefault();

        var key = $('.s-text[type=search]').val(),
            search = location.search.substring(1),
            sarry = search.split('&'),
            urlAry=[];

        var marginLeft = $firstBox.css('marginLeft');

        if(isSub) {

            $('.sp-wrap').css({
                '-webkit-transform': 'translate(0px, 0px)',
                'transform': 'translate(0px, 0px)'
            });

            $('#panelBack').html('取消');

            $('.ui-panel .title').html('筛选');

            isSub = false;

        }else{

            for (var i = 0; i < sarry.length; i++) {
                var item = sarry[i].split('=');
                switch (item[0]){
                    // case 'order':
                    //     item[i][1] = GetQueryString("order");
                    case 'keyword':
                        item[1] = key;
                        break;
                    case 'area':
                        item[1] = areaValue;
                        break;
                    case 'city':
                        item[1] = cityValue;
                        break;
                    case 'timespm':
                        item[1] = rankValue;
                    // case 'sort':
                    //     item[i][1] = GetQueryString("order");

                }
                urlAry.push(item.join('='));
            };

            var urlstr = urlAry.join('&');

            if(urlstr.indexOf('area') == -1){
                urlstr += '&area='+areaValue ;
            }
            if(urlstr.indexOf('city') == -1){
                urlstr += '&city='+cityValue;
            }
            if(urlstr.indexOf('timespm') == -1){
                urlstr += '&timespm='+rankValue ;
            }


            console.log(urlstr)

            window.location.href = location.protocol + '//' + location.hostname + location.pathname + '?' +urlstr;

        }
    });



    // 搜索框
    $('#searchForm').on('input', '[type="search"]', function (e) {
    	
    	var $parent = $(this).parents('#searchForm');

    	$parent.find('.s-btn').show();

    	$parent.find('.sf-wrap').css({'text-align': 'left'});

    });


    $('#socialShare').on('touchend', function (event) {
        event.preventDefault();
        setMask.open();
        $('.ui-share').show();
        $('html').css('overflow','hidden');
    });
    
    $(document).on('touchend', '#closeShare', function (event) {
        event.preventDefault();
        setMask.close();
        $('.ui-share').hide();
        $('html').css('overflow','auto');

    })
    










    
    

})