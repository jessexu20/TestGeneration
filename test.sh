clear
echo "the script start now"
node_modules/.bin/istanbul cover test.js > test.txt
# while read line
# do
# 	# echo $line
# 	temp1=$( grep -o "[[:digit:]]{1,2}\.[[:digit:]]{1,2}[%]" <<<"$line")
#
# 	echo $temp1
# done <test.txt
filename='test.txt'
filename1='b'
sed -n '3,6p' "$filename">b
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
	echo "greater"
else 
	echo "smaller"
fi

done < "$filename1"
echo "end!"
echo

