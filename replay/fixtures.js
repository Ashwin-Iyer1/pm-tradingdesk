export const events=[
 {type:'snapshot',seq:100,time:0,yes:[[.42,50],[.40,100],[.37,250]],no:[[.55,30],[.53,100],[.50,200]],note:'Initial two-sided book'},
 {type:'delta',seq:101,time:1,side:'no',price:.55,change:-20,note:'Best YES ask loses 20 contracts'},
 {type:'delta',seq:102,time:2,side:'yes',price:.425,change:25.5,note:'Sub-cent bid and fractional size'},
 {type:'delta',seq:104,time:3,side:'no',price:.55,change:-10,note:'Missing sequence 103: freeze previews'},
 {type:'delta',seq:105,time:4,side:'yes',price:.42,change:10,note:'Delta cannot repair a gap'},
 {type:'snapshot',seq:110,time:5,yes:[[.425,25.5],[.42,50],[.40,100]],no:[[.54,60],[.52,120],[.49,200]],note:'Recovery snapshot restores synchronization'},
 {type:'delta',seq:111,time:6,side:'no',price:.54,change:-60,note:'Level depleted and removed'},
 {type:'delta',seq:112,time:7,side:'yes',price:.43,change:40,note:'New best YES bid'},
 {type:'delta',seq:112,time:7,side:'yes',price:.43,change:40,note:'Duplicate ignored, size must not double'},
 {type:'delta',seq:113,time:8,side:'no',price:.535,change:15.25,note:'New fractional best ask depth'}
];
