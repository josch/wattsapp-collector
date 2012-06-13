install:
	env | grep DESTDIR
	env | grep PREFIX
	mkdir -p ${DESTDIR}/usr/bin
	cp collector.js ${DESTDIR}/usr/bin/wattsapp-collector
	chmod +x ${DESTDIR}/usr/bin/wattsapp-collector
	mkdir -p ${DESTDIR}/etc/avahi/services/
	cp avahi.service ${DESTDIR}/etc/avahi/services/wattsapp-collector.service
