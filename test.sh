#!/bin/sh
# Refuse to commit files with the string NOCOMMIT, debugger, or merge markers present.
#
echo "Check Commit Script start now"
echo "--------Running Istanbul"
node_modules/.bin/istanbul cover test.js > test.txt
filename='test.txt'
filename1='result.txt'
sed -n '3,6p' "$filename">$filename1
echo "Istanbul Finished"
echo
echo "--------Running Static Analysis tool Jshint!!"
jshint subject.js

echo
echo "---------Checking whether coverage Satisfy Requirements~~~~~~"
echo 
while read line
do
var="50"
hundred="100"
temp=$line
t=${temp:15:3}
if [ "$t" == "$hundred" ];
then
	t="99."
fi


t1=${t:0:2}
if [ "$t1" -gt "$var" ];
then
	echo ${temp:0:10} "Coverage is higher than " $var "%! Pass!"
else 
	echo ${temp:0:10} "Coverage is less than " $var "%."
	echo "!!!Failed to commit!!! Please check the test.txt for references" 
	exit 1
fi

done < $filename1
echo


