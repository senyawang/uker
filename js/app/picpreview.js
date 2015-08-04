$(function(){

        function getDataCheck(){
            var pubu = $("#pubu");
            var box = $(".pbox");
            var lastboxHeight = $(box[box.length-1]).offset().top+Math.floor($(box[box.length-1]).height()/2);
            var documentHeight = $(window).height();
            var scrollTop = $(window).scrollTop();
            return lastboxHeight<documentHeight+scrollTop?true:false;
        }

        $('#pubu').waterfall();
        var water = setInterval(function (e) {
             $('#pubu').waterfall();
             $('#pubu').find('.item').remove();
        },1000);

        setTimeout(function () {
            clearInterval(water);
        },5000);
        
        

        var ajaxkey = true,
            page = 2;
        $(window).scroll(function(){
            if (getDataCheck() && ajaxkey) {
                var pubu = $("#pubu");
                    
                ajaxkey = false;
                $.ajax({
                    url: ajaxUrl,
                    data: {
                        page: page
                    },
                    dataType: 'jsonp',
                    success: function (data) {
                        
                        if(data.status){
                            var html = template('loadMore', data);
                            pubu.append(html);
                            $('#pubu').waterfall();
                            ajaxkey = true;
                            page++;
                        }else{
                            $('.school-photo').append('<div style="padding:20px;text-align:center;">'+data.msg+'</div>')
                        }
                    }
                })
                                

                //getData（"#pubu",".box"）；//jquery的Ajax异步加载数据、需要从数据库加载的、需要调用该函数
            };
        });




    })