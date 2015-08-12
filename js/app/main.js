
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

                        page++;

                    }else{
                        me.disable(dir);
                    }


                }
                
            });
        }
    });
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

$(function () {

    window.scrollTo(0, 1);//收起地址栏

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
    	$('#push-right').on('touchend', function () {

            $('#panel').panel('toggle', 'overlay', 'right');
            
            setMask.open();
            $('html').css('overflow','hidden');
        });
        $('#panel').on('beforeclose', function (e) {
            setMask.close();
            $('html').css('overflow','auto');
            
        })

        $('#filterPanel').on('touchend', function () {

            $('#panel2').panel('toggle', 'overlay', 'right');
            
            setMask.open();
            $('html').css('overflow','hidden');
        });
        $('#panel2').on('beforeclose', function (e) {
            setMask.close();
            $('html').css('overflow','auto');
            
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
    

    $('#nav').navigator();


    // 筛选面板

    var $firstBox = $("#mainPanelBox"),
        areaValue = '全部',
        cityValue = '全部',
        rankValue = '全部',
        subPanelParent;

    $firstBox.on('touchend', 'li', function (e) {

    	e.preventDefault();

    	$firstBox.css('marginLeft', '-50%');

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

    $('#subPanelBox').on('touchend', 'li', function (e) {
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

    $('#panelBack').on('tap', function (e) {
        
        e.preventDefault();

        var marginLeft = $firstBox.css('marginLeft');

        if(marginLeft == '0px' || marginLeft == null) PANEL.close();

        $firstBox.css('marginLeft', '0');

        $(this).html('取消');

        $('.ui-panel .title').html('筛选');
    });

    $('#panelSearch').on('tap', function (e) {
        e.preventDefault();

        var key = $('.s-text[type=search]').val(),
            search = location.search.substring(1),
            sarry = search.split('&'),
            urlAry=[];

        var marginLeft = $firstBox.css('marginLeft');

        if(marginLeft !== '0px') {
            $('#panelBack').trigger('tap');
            return;
        }

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
                case 'rank':
                    item[1] = rankValue;
                // case 'sort':
                //     item[i][1] = GetQueryString("order");

            }
            urlAry.push(item.join('='));
        };

        var urlstr = urlAry.join('&');

        if(urlstr.indexOf('area') == -1){
            urlstr += '&area='+areaValue+'&city='+cityValue+'&timespm='+rankValue ;
        }

        console.log(urlstr)

        window.location.href = location.protocol + '//' + location.hostname + location.pathname + '?' +urlstr;


        // window.location.href = location.protocol+'//'+location.hostname+location.pathname+'?order='+GetQueryString("order")+'&keyword='+key+'&area='+areaValue+'&city='+cityValue+'&timespm='+rankValue+'&sort='+GetQueryString("sort");
    })



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