// نمایش کارت ها هنگام اسکرول

const cards = document.querySelectorAll(".card");


function showCards(){

    cards.forEach(card=>{

        const position = card.getBoundingClientRect().top;

        const screen = window.innerHeight;


        if(position < screen - 100){
            card.classList.add("show");
        }

    });

}


window.addEventListener("scroll",showCards);

showCards();



// افکت تغییر امتیاز
const scores = document.querySelectorAll(".score");


scores.forEach(score=>{

    let target = parseFloat(
        score.innerText.replace("⭐","")
    );

    let current = 0;


    let timer = setInterval(()=>{

        current += 0.1;


        if(current >= target){
            current = target;
            clearInterval(timer);
        }


        score.innerText =
        "⭐ " + current.toFixed(1);

    },40);


});