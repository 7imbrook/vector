FROM    centos:centos6
# Enable EPEL for Node.js
RUN     rpm -Uvh http://download.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
# Install Node.js and npm
RUN     yum install -y npm

# Bundle app source
COPY . /src
# Install app dependencies
RUN cd /src; npm install
RUN cd /src; bower install
RUN cd /src; gulp build

EXPOSE  3000
EXPOSE  3001
CMD ["gulp", "serve"]
