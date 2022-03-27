const numBalls = 5;
const gravity = 0.25;
const spawnRange = 600;
const floorThickness = 50;
const ballDensity = 0.5;
const COR = 0.999;
const insideCorrection = 10;
const maxBallRadius = 70;
const repulsionConstant = -0.0000005;

let paused = false;
let ballSelected = null;
let isRepelling = false;
let distThreshold = 0.75;
let balls = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate = 60;
    fill(0,0,0);
}

function keyPressed() {
    if (keyCode === CONTROL) {
        paused = !paused;
    }
    if (keyCode === SHIFT) {
        isRepelling = !isRepelling;
    }
    if (keyCode === ENTER && balls.length > 0) {
        let ok = false;
        let mx, my;
        while (!ok) {
            ok = true;
            mX = width / 2 + Math.floor(Math.random() * width / 3) * (Math.random() < 0.5 ? 1 : -1);
            mY = height / 2 + Math.floor(Math.random() * height / 3) * (Math.random() < 0.5 ? 1 : -1);
            if (mX - maxBallRadius < floorThickness || mX + maxBallRadius > width - floorThickness || mY - maxBallRadius < floorThickness || mY + maxBallRadius > height - floorThickness) {
                ok = false;
            }
            for (let i = 0; i < balls.length; i++) {
                if (balls[i].getDistance(mX, mY) < balls[i].radius + maxBallRadius) {
                    ok = false;
                }
            }
        }
        let newBall = new Ball(
            mX,
            mY,
            Math.floor(Math.random() * 10) * (Math.random() < 0.5 ? 1 : -1),
            0,
            maxBallRadius - 10 + Math.floor(Math.random() * 10) * (Math.random() < 0.5 ? 1 : -1)
        );
        balls.push(newBall);
        newBall.repellers.push(balls.length - 2);
        balls[balls.length - 2].repellers.push(balls.length - 1);
    }
}

function mouseClicked(event) {
    const mX = event.clientX;
    const mY = event.clientY;

    if (mX - maxBallRadius < floorThickness || mX + maxBallRadius > width - floorThickness || mY - maxBallRadius < floorThickness || mY + maxBallRadius > height - floorThickness) {
        return;
    }

    for (let i = 0; i < balls.length; i++) {
        if (balls[i].getDistance(mX, mY) < balls[i].radius + maxBallRadius) {
            if (ballSelected == null) {
                ballSelected = i;
            } else if (!balls[i].repellers.includes(ballSelected) && i != ballSelected) {
                balls[i].repellers.push(ballSelected);
                balls[ballSelected].repellers.push(i);
                ballSelected = null;
            }
            return;
        }
    }

    balls.push(new Ball(
        mX,
        mY,
        Math.floor(Math.random() * 10) * (Math.random() < 0.5 ? 1 : -1),
        0,
        maxBallRadius - 10 + Math.floor(Math.random() * 10) * (Math.random() < 0.5 ? 1 : -1)
    ));
}

function draw() {
    background(255, 255, 255);
    for (let i = 0; i < balls.length; i++) {
        if (!paused) {
            balls[i].repulse();
            if (balls[i].repels) {
                balls[i].resetForces();
            }
            balls[i].move();
            balls[i].environmentCollision();
            balls[i].ballCollision(i);
        }
        balls[i].render();
        if (!paused) {
            balls[i].resetForces();
        }
    }
    //renderFloor
    rect(0, 0, floorThickness, height);
    rect(0, 0, width, floorThickness);
    rect(width - floorThickness, 0, width, height);
    rect(0, height - floorThickness, width, floorThickness);
}

class Ball {
    constructor(xStart, yStart, vXStart, vYStart, radius) {
        this.x = xStart;
        this.y = yStart;
        this.vx = vXStart;
        this.vy = vYStart;
        this.pvx = vXStart;
        this.pxy = vYStart;
        this.ay = 0;
        this.ax = 0;
        this.fx = 0;
        this.fy = 0;
        this.radius = radius;
        this.mRank = balls.length;
        this.repels = isRepelling;
        this.repellers = [];
    }

    resetForces() {
        this.fx = 0;
        this.fy = this.repels ? 0 : gravity * Math.PI * Math.pow(this.radius, 2) * ballDensity;
    }

    repulse() {
        const myMass = Math.PI * Math.pow(this.radius, 2) * ballDensity;
        for (let i = 0; i < this.repellers.length; i++) {
            let targetBall = balls[this.repellers[i]];
            const repulsionForceX = (this.repels ? -5000000 : 1) * myMass * repulsionConstant / (this.repels ? Math.pow(Math.abs(targetBall.x - this.x), 0.5) : Math.pow(targetBall.x - this.x, -2)) * Math.sign(targetBall.x - this.x);
            const repulsionForceY = (this.repels ? -5000000 : 1) * myMass * repulsionConstant / (this.repels ? Math.pow(Math.abs(targetBall.y - this.y), 0.5) : Math.pow(targetBall.y - this.y, -2)) * Math.sign(targetBall.y - this.y);
            targetBall.fx += repulsionForceX;
            targetBall.fy += repulsionForceY;
        }
    }

    move() {
        const myMass = Math.PI * Math.pow(this.radius, 2) * ballDensity;
        this.ay = this.fy / myMass;
        this.ax = this.fx / myMass;
        this.vy += this.ay;
        this.vx += this.ax;
        this.x += this.vx;
        this.y += this.vy;
    }

    render() {
        if (this.repels) {
            fill(255, 0, 0);
        }
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
        fill(0, 0, 0);
        for (let i = 0; i < this.repellers.length; i++) {
            if (this.mRank < this.repellers[i]) {
                line(this.x, this.y, balls[this.repellers[i]].x, balls[this.repellers[i]].y);
            }
        }
    }

    environmentCollision() {
        //floor
        if (this.y + this.radius > height - floorThickness) {
            this.y = height - floorThickness - this.radius;
            this.vy *= -COR;
        } else if (this.y - this.radius < floorThickness) {
            this.y = floorThickness + this.radius;
            this.vy *= -COR;
        }
        if (this.x - this.radius < floorThickness) {
            this.x = floorThickness + this.radius;
            this.vx *= -COR;
        }else if (this.x + this.radius > width - floorThickness) {
            this.x = width - floorThickness - this.radius;
            this.vx *= -COR;
        }
    }

    ballCollision(rank) {
        for (let i = rank + 1; i < balls.length; i++) {
            const dist = this.getDistance(balls[i].x, balls[i].y);
            const idealDist = this.radius + balls[i].radius;
            if (dist <= idealDist) {
                if (dist < idealDist * distThreshold) {
                    const dx = this.x - balls[i].x;
                    const dy = this.y - balls[i].y;
                    const alongLineX = (idealDist / 2) * dx / dist;
                    const alongLineY = (idealDist / 2) * dy / dist;

                    if (dx > 0) {
                        this.x = (this.x + balls[i].x) / 2 + alongLineX + insideCorrection;
                        balls[i].x = (this.x + balls[i].x) / 2 - alongLineX - insideCorrection;
                        this.vx = 0;
                        balls[i].vx = 0;
                    } else {
                        this.x = (this.x + balls[i].x) / 2 - alongLineX - insideCorrection;
                        balls[i].x = (this.x + balls[i].x) / 2 + alongLineX + insideCorrection;
                        this.vx = 0;
                        balls[i].vx = 0;
                    }

                    if (dy > 0) {
                        this.y = (this.y + balls[i].y) / 2 + alongLineY + insideCorrection;
                        balls[i].y = (this.y + balls[i].y) / 2 - alongLineY - insideCorrection;
                        this.vy = 0;
                        balls[i].vy = 0;
                    } else {
                        this.y = (this.y + balls[i].y) / 2 - alongLineY - insideCorrection;
                        balls[i].y = (this.y + balls[i].y) / 2 + alongLineY + insideCorrection;
                        this.vy = 0;
                        balls[i].vy = 0;
                    }
                }

                const m1 = Math.PI * Math.pow(this.radius, 2) * ballDensity;
                const m2 = Math.PI * Math.pow(balls[i].radius, 2) * ballDensity;
                let v1 = this.vy;
                let v2 = balls[i].vy;
                let nV2 = (2 * m1 * v1 - m1 * v2 + m2 * v2) / (m1 + m2);
                let nV1 = (m1 * v1 + m2 * v2 - m2 * nV2) / m1;

                this.vy = nV1;
                balls[i].vy = nV2;

                v1 = this.vx;
                v2 = balls[i].vx;
                nV2 = (2 * m1 * v1 - m1 * v2 + m2 * v2) / (m1 + m2);
                nV1 = (m1 * v1 + m2 * v2 - m2 * nV2) / m1;

                this.vx = nV1;
                balls[i].vx = nV2;
                
            }
        }
    }

    getDistance(x1, y1) {
        return Math.pow(Math.pow(this.x - x1, 2) + Math.pow(this.y - y1, 2), 0.5);
    }
}
