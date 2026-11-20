function platform(x,w,topProfile,variant){
  return Object.freeze({x,w,topProfile:Object.freeze(topProfile),variant});
}

function preset(id,...platforms){
  return Object.freeze({id,platforms:Object.freeze(platforms)});
}

export const ARENA_PLATFORM_PRESETS=Object.freeze({
  'forest-1':Object.freeze([
    preset('forest-creek-v1',
      platform(112,64,[276,274,272,274],0),
      platform(268,80,[264,262,262,264,266],1),
      platform(456,64,[252,250,252,254],3)),
    preset('forest-terrace-v1',
      platform(176,96,[266,264,264,266,268,266],1),
      platform(240,64,[216,218,220,220],2),
      platform(440,80,[272,270,268,270,272],0)),
    preset('forest-ruins-v1',
      platform(104,48,[282,280,282],3),
      platform(296,112,[256,254,252,252,254,256,258],2),
      platform(496,64,[268,266,266,268],1))
  ]),
  'mine-1':Object.freeze([
    preset('mine-rails-v1',
      platform(112,80,[276,276,278,278,276],2),
      platform(288,64,[256,256,256,256],1),
      platform(472,80,[268,266,264,266,268],0)),
    preset('mine-lift-v1',
      platform(128,64,[276,274,272,274],0),
      platform(288,64,[216,216,218,220],3),
      platform(320,112,[268,270,268,266,266,268,270],1)),
    preset('mine-catwalk-v1',
      platform(128,64,[282,280,280,282],1),
      platform(256,112,[256,254,254,254,256,256,258],2),
      platform(464,96,[270,268,266,266,268,270],3))
  ])
});
