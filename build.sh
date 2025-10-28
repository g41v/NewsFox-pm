#!/bin/bash

rm -rf build

mkdir -p build/chrome
cp install.* build/
find ./chrome/ ! -regex .*CVS.* -exec cp --parents '{}' ./build/ \;
cd build/chrome
jar -cf newsfox.jar ./*
find ./ -mindepth 1 ! -name 'newsfox.jar' -exec rm -rf {} \;
cd ..
zip -9 -r newsfox.xpi *
mv newsfox.xpi ../../www/
cd ..
