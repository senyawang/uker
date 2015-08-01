
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
    tpl: '<div class="ui-masks" style="position:absolute;-webkit-transition: all 0.5s; transition: all 0.5s;"></div>',
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
            self.mask.hide();
            
        },500)
        if(typeof(fn) === 'function') fn();
    }
}
function GetQueryString(name){

     var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
     var r = window.location.search.substr(1).match(reg);
     if(r!=null)return  unescape(r[2]); return "";

}

$(function () {

    $(document).on('touchend', '#goBack', function (e) {
        e.preventDefault();
        window.history.go(-1);
    })

    if($('#panel').length){


	var PANEL = new gmu.Panel($('#panel'),{
        contentWrap: $('.mainpage')
    });
	$('#push-right').on('touchend', function () {

        $('#panel').panel('toggle', 'overlay', 'right');
        
        setMask.open();
    });
    $('#panel').on('beforeclose', function (e) {
        setMask.close();
            
    })
    }
    $("#slider").show();
    $("#slider").slider({
        loop: true,
        autoPlay: true,
        dots: false,
        arrow: false,
        imgZoom: true
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

        var html = '';

        switch (subPanelParent){
            case 'J_areaValue':
                for (var i = 0; i < area.length; i++) {
                    html += '<li data-value='+ area[i] +'><a href="#">' +
                            '<span class="sl-item">'+ area[i] +'</span>' +
                            '<span class="sl-item"></span>' +
                        '</a></li>';
                };
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
                break;
            case 'J_rankValue':
                for (var i = 0; i < rank.length; i++) {
                    html += '<li data-value='+ rank[i] +'><a href="#">' +
                            '<span class="sl-item">'+ rank[i] +'</span>' +
                            '<span class="sl-item"></span>' +
                        '</a></li>';
                };
                break;  
        }

        $('#subPanelBox .sp-list').html(html);
        $('[data-value="'+ areaValue +'"]').addClass('hover');
        $('[data-value="'+ cityValue +'"]').addClass('hover');
        $('[data-value="'+ rankValue +'"]').addClass('hover');

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

    $('#panelBack').on('touchend', function (e) {
        
        e.preventDefault();

        var marginLeft = $firstBox.css('marginLeft');

        if(marginLeft == '0px' || marginLeft == null) PANEL.close();

        $firstBox.css('marginLeft', '0')
    });

    $('#panelSearch').on('touchend', function (e) {
        e.preventDefault();

        var key = $('.s-text[type=search]').val(),
            search = location.search.substring(1),
            sarry = search.split('&'),
            urlAry=[];

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

    })

    










    
    

})