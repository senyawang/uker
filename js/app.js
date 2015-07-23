$(function () {
	
	$('.panel').panel({
            contentWrap: $('.cont')
        });
	$('#push-right').on('click', function () {
            $('.panel').panel('toggle', 'push', 'right');
        });

})