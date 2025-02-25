function clickButton(buttonText) {
    const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes(buttonText));
    if (button) {
        button.click();
        showFeedback(`${buttonText} 버튼이 클릭되었습니다!`, buttonText === '좋음' ? '#4CAF50' : '#F44336');
    }
}

function showFeedback(message, color) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.position = 'fixed';
    feedback.style.top = '20px';
    feedback.style.left = '50%';
    feedback.style.transform = 'translateX(-50%)';
    feedback.style.padding = '10px';
    feedback.style.backgroundColor = color;
    feedback.style.color = 'white';
    feedback.style.borderRadius = '5px';
    feedback.style.zIndex = '9999';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 2000);
}

document.addEventListener('keydown', function(event) {
    const currentUrl = window.location.href;
    
    if (
        currentUrl.includes('https://viewtrap.com/thumbnail-master') || 
        currentUrl.includes('https://viewtrap.com/thumbnail-master?masterTp=hotVideo')
    ) {
        if (event.key === 'z' || event.key === 'G') {
            event.preventDefault();
            clickButton('좋음');
        }

        if (event.key === '/' || event.key === 'B') {
            event.preventDefault();
            clickButton('나쁨');
        }
    }
});
