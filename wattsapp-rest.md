Connections will only be accepted via https.

Authentication between cloud-collector is done via client certificates.

Authentication between client-cloud is done via facebook id token.

list
====

Example
-------

	https://server.tld/list

Description
-----------

Prints a list of available devices.

	[
	 {"id": 1, "name": "toaster", "status": "active" },
	 {"id": 2, "name": "fridge", "status", "active" },
	 {"id": 3, "name": "oven", "status", "active"},
	 {"id": 4, "name": "lamp", "status", "blacklisted"}
	]

details & sum
=============

Example
-------

	https://server.tld/details?sensors=4,8,2&time=T1:T2
	https://server.tld/sum?sensors=4,8,2&time=T1:T2

Description
-----------

`sensors` is a comma separated list of sensor ids the user wants to inquire
information about. When supplying an empty value for `sensors`, data for all
sensors is returned.

`time` is a colon separated value of two unix timestamps T1 and T2. The special
value -1 exists to denote and open interval to either side. `-1:-1` requests
data of all times and so does a query without the `time` parameter. The time
values T1 and T2 form a closed interval. When supplying an empty value for
`time` is the same as supplying `-1:-1`.

Hence, the following query would return everything the server has on all
sensors and hence are equal:

	https://server.tld/details
	https://server.tld/details?sensors=&time=
	https://server.tld/details?sensors=&time=-1:-1

Example output:

	[
	 {"id": 1, "name": "toaster", "status": "active", "values": [
	  {"begin": 1317470289, "end": 1317470312, "value": 1.3234},
	  {"begin": 1317470312, "end": 1317470678, "value": 7.123}
	 ]},
	 {"id": 2, "name": "fridge", "status": "active", "values": [
	  {"begin": 1317470289, "end": 1317470312, "value": 0.12},
	  {"begin": 1317470312, "end": 1317470678, "value": 7.123},
	  {"begin": 1317470678, "end": 1317471421, "value": 1.354}
	 ]},
	 {"id": 3, "name": "oven", "status": "active", "values": [
	  {"begin": 1317470312, "end": 1317470678, "value": 1.3234}
	 ]}
	]

If a query cannot be satisfied (sensor id doesnt exist, no data exists for the
desired timestamps, sensor is blacklisted) the server will silently fail and
just send an empty "values" dictionary or as much data it can satisfy the query
with. It is the task of the client to verify the returned information for
completeness.

blacklist mote
==============

Example
-------

	https://server.tld/blacklast?sensors=4,8
	https://server.tld/unblacklist?sensors=4,8

Description
-----------

`sensors` is a comma separated list of sensor ids as in the other queries.

The return is a list of the (un)blacklisted devices as in the `list` command.

Query data from the motes
=========================

using coap GET like:

	coap://mote.tld/value

Example output:

	{"id": 1, "values": [
	 {"begin": 1317470289, "end": 1317470312, "value": 1.3234},
	 {"begin": 1317470312, "end": 1317470678, "value": 7.123}
	]}
