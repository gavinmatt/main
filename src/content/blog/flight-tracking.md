---
title: "ADS-B: How to Waste Time and Money in the Name of Open Data"
description: "How to build your own ADS-B receiver and descend into madness"
pubDate: "April 25 2024"
heroImage: "https://res.cloudinary.com/draaqu0o9/image/upload/f_auto,q_auto/v1/flight-tracker/dwueajqpt7oiiud9alkl"
tags: ["DIY", "Technology"]
---
<i>Plane goes whoosh!</i>

This month, I had a spark of inspiration and decided to finally do something with the growing pile of Raspberry Pis and the radio USB dongle I had lying around (thanks Micro Center!). Most of these toys came from since abandoned projects like Piholes and shortwave radio scanning. Thankfully, I had an idea in mind already - tracking flights!

Most planes transmit ADS-B data, which apparently stands for Automatic Dependent Surveillance - Broadcast. This is basically a radio signal that provides information like an aircraft’s speed, altitude, and exact location, so that aircraft can safely navigate and not crash into each other constantly. If you’ve used platforms like Flightradar24 to figure out why your plane is late, most of that data comes from ADS-B signals. Before this kind of data was available, this actually happened with some frequency! ADS-B isn’t the only type of positioning data in use by modern aircraft - we have radar after all - but is common, accessible, and most critical to my DIY needs, freely available with the right equipment!

Collecting this data is about as barebones of a project as you can get. You need very little equipment, and probably have all but one item in a box in your office right now (next to the 25 year collection of various cords). You need:

<ul>
<li>A Raspberry Pi, hopefully a 3 or newer</li>
<li>A microSD card</li>
<li>A RTL-SDR dongle or similar USB antenna and tuner (you will have to buy this; get one with an antenna)</li>
<li>Basic knowledge of Linux, enough to bash (heh) around <code>apt</code> and <code>systemctl</code></li>
<li>Free time and incredible patience troubleshooting your feeders using out of date forums</li>
</ul>

There are countless guides out there for the setup. I used a few, but recommend that you just follow [Flightaware’s guide](https://www.flightaware.com/adsb/). You can also start with guides from Flightradar24 or anyone else, but apparently Flighaware’s image runs a bit more predictably when feeding multiple sites.

In my case, I use Raspberry’s fancy Raspberry Pi Imager to…image the microSD card. Think of this as pushing the operating system onto the SD card so that the Pi has brains. After than, you can SSH in and follow the guides as each unique service has its own set of copy and paste requirements to get things running. Once you have one service running, you can also add other “feeders,” or services that collect and push ADS-B data somewhere else, easily. 

Now the madness - I had to reimage my Pi probably 30+ times for various reasons. That includes corrupted SD cards, several images that added random SSH and network SSID values, and conflicting crashing feeders. It's pretty hard to fix a headless Pi when you can't SSH into it! Each loop took 30ish minutes to fail, meaning I wasted hours and hours at night or on the weekends jogging back and forth between my house and garage to push a button. I finally got a stable build by doing Flightradar, THEN piaware, and THEN ADS-B Exchange. Leet hacker skills.

Now, it’s a game of maximizing distance. The theoretical limit for ADS-B data is something like 300 nautical miles (or about 350 freedom units), and it’s best collected with a vertical antenna. This is where upgrade #1 came in - a new vertical antenna to replace the rabbit ears that come with the RTL-SDR dongle! I already have an antenna array on my garage for HAM radio, so adding another vertical antenna would be easy. You don’t need this, but this is one of the many ways to waste money that radio hobbies will introduce you to.

One very annoying nag with some SDR dongles is that they use a crazy niche connector called MCX. Unlike common formats like SMA for coax or HF for HAM, MCX is tiny, adaptors are hard to find, and most crucially, I don’t have a run of MCX coming into my garage. That means for now, I’ve committed the cardinal sin - mounting an antenna inside of my garage! One day soon, I’ll run some MCX and mount it outside like an adult. Still, I routinely average over 100 miles of range.

<img src="https://res.cloudinary.com/draaqu0o9/image/upload/f_auto,q_auto/v1/flight-tracker/c0kjnwabrgbg3szimmyz" alt="A shoddy antenna setup">
<div align="center" style="padding-bottom:10px"><i>I feel awful sharing this setup...</i></div>

Now to the fun part, the data. I feed data to Flightradar24, Flightaware, and most importantly, ADS-B Exchange. These are all services that consume this data and use it to make pretty flight maps. Beyond that, they also provide tools to airports and aviators to help them stay safe and plan traffic. The more ADS-B coverage around the world, the more accurate and timely the map! 

ADS-B Exchange is crucial for two reasons - it promotes open data and it allows you to embed your map of data wherever you want. Unless you feel like dealing with concepts as threatening as “reverse proxy,” “Flask server,” and “cross-site scripting,” ADS-B’s map is pretty damn good. I eventually want to create my own, but for now, it’ll do just fine.

With that, here’s the newest project on my website - a live flight tracker pulling my real data! You can load the tracker on its own [here](https://www.gavmatt.com/flight-tracker), but I’ll also embed it below. This is insanely easy to setup - you just iframe in the ADS-B Exchange map with a few URL parameters to filter to your feeder, set the map center and zoom, and control the map UI. The map updates in realtime as new data is collected by my antenna setup. They even have a [leaderboard](https://globe.adsbexchange.com/leaderboard/) so that you can become king of the nerds!

Other providers offer some pretty great benefits for feeding data. In particular, Flightradar24 offers their premium Business plan for free as long as you feed data! 

<div style="display: flex; justify-content: center;">
        <iframe src="https://globe.adsbexchange.com/?feed=TIS6mWpnVYgH&hideSidebar&hideButtons&zoom=8&lat=39.172&lon=-104.853" width="800" height="600" frameborder="0" style="border: 0;"></iframe>
</div>

Let me know what other projects I should do next or if you have your own ADS-B setup! 