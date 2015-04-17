/**!
 *
 *  Copyright 2015 Netflix, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

/*jslint node: true*/
/*jslint nomen: true */
/*jslint browser: true*/
/*global d3, angular, _, $*/
/*jslint plusplus: true */

'use strict';

/* Services */

var services = angular.module('app.services', []);

services.factory('MetricService', function ($http, $rootScope, PMAPIService) {
    return {
        getInames: function (metric, iid) {
            return PMAPIService.getInstanceDomainsByName($rootScope.properties.context, metric, [iid]);
        }
    };
});

services.factory('MetricListService', function ($rootScope, $http, $log, $q, PMAPIService, Metric, CumulativeMetric, ConvertedMetric, CumulativeConvertedMetric, DerivedMetric, flash) {
    var simpleMetrics = [],
        derivedMetrics = [];
    return {
        getOrCreateMetric: function (name) {
            var metric = _.find(simpleMetrics, function (el) {
                return el.name === name;
            });

            if (metric === undefined) {
                metric = new Metric(name);
                simpleMetrics.push(metric);
            } else {
                metric.subscribers++;
            }
            return metric;
        },
        getOrCreateCumulativeMetric: function (name) {
            var metric = _.find(simpleMetrics, function (el) {
                return el.name === name;
            });

            if (metric === undefined) {
                metric = new CumulativeMetric(name);
                simpleMetrics.push(metric);
            } else {
                metric.subscribers++;
            }
            return metric;
        },
        getOrCreateConvertedMetric: function (name, conversionFunction) {
            var metric = _.find(simpleMetrics, function (el) {
                return el.name === name;
            });

            if (metric === undefined) {
                metric = new ConvertedMetric(name, conversionFunction);
                simpleMetrics.push(metric);
            } else {
                metric.subscribers++;
            }
            return metric;
        },
        getOrCreateCumulativeConvertedMetric: function (name, conversionFunction) {
            var metric = _.find(simpleMetrics, function (el) {
                return el.name === name;
            });

            if (metric === undefined) {
                metric = new CumulativeConvertedMetric(name, conversionFunction);
                simpleMetrics.push(metric);
            } else {
                metric.subscribers++;
            }
            return metric;
        },
        getOrCreateDerivedMetric: function (name, derivedFunction) {
            var metric = _.find(derivedMetrics, function (metric) {
                return metric.name === name;
            });

            if (metric === undefined) {
                metric = new DerivedMetric(name, derivedFunction);
                derivedMetrics.push(metric);
            } else {
                metric.subscribers++;
            }
            return metric;
        },
        destroyMetric: function (name) {
            var index,
                metric = _.find(simpleMetrics, function (el) {
                    return el.name === name;
                });

            metric.subscribers--;

            if (metric.subscribers < 1) {
                index = simpleMetrics.indexOf(metric);
                if (index > -1) {
                    simpleMetrics.splice(index, 1);
                }
            }
        },
        destroyDerivedMetric: function (name) {
            var index,
                metric = _.find(derivedMetrics, function (el) {
                    return el.name === name;
                });

            metric.subscribers--;

            if (metric.subscribers < 1) {
                index = derivedMetrics.indexOf(metric);
                if (index > -1) {
                    derivedMetrics.splice(index, 1);
                }
            }
        },
        clearMetricList: function () {
            /*jslint unparam: true*/
            $.each(simpleMetrics, function (index, metric) {
                metric.clearData();
            });
            /*jslint unparam: false*/
        },
        clearDerivedMetricList: function () {
            /*jslint unparam: true*/
            $.each(derivedMetrics, function (index, metric) {
                metric.clearData();
            });
            /*jslint unparam: false*/
        },
        updateMetrics: function (callback) {
            var metricArr = [],
                url,
                host = $rootScope.properties.host,
                context = $rootScope.properties.context;

            if (context && context > 0 && simpleMetrics.length > 0) {
                /*jslint unparam: true*/
                $.each(simpleMetrics, function (index, value) {
                    metricArr.push(value.name);
                });
                /*jslint unparam: false*/

                url = 'http://' + host + '/pmapi/' + context + '/_fetch?names=' + metricArr.join(',');

                PMAPIService.getMetrics(context, metricArr)
                    .then(function (metrics) {
                        angular.forEach(metrics.values, function (value) {
                            var name = value.name;
                            angular.forEach(value.instances, function (instance) {
                                var iid = angular.isUndefined(instance.instance) ? 1 : instance.instance;
                                var iname = metrics.inames[name].inames[iid];

                                var metricInstance = _.find(simpleMetrics, function (el) {
                                    return el.name === name;
                                });
                                if (angular.isDefined(metricInstance) && metricInstance !== null) {
                                    metricInstance.pushValue(metrics.timestamp, iid, iname, instance.value);
                                }
                            });
                        });
                    }).then(
                        function () { callback(true); },
                        function () {
                            flash.to('alert-dashboard-error').error = 'Failed fetching metrics.';
                            // Check if context is wrong and update it if needed
                            // PMWEBAPI error, code -12376: Attempt to use an illegal context
                            callback(false);
                    });
            }
        },
        updateDerivedMetrics: function () {
            if (derivedMetrics.length > 0) {
                /*jslint unparam: true*/
                $.each(derivedMetrics, function (index, metric) {
                    metric.updateValues();
                });
                /*jslint unparam: false*/
            }
        }
    };
});

services.factory('D3Service', function () {
    return {
        xAxisTickFormat: function () {
            return function (d) {
                return d3.time.format('%X')(new Date(d));
            };
        },
        yAxisTickFormat: function () {
            return function (d) {
                return d3.format('.02f')(d);
            };
        },
        yAxisIntegerTickFormat: function () {
            return function (d) {
                return d3.format('f')(d);
            };
        },
        yAxisPercentageTickFormat: function () {
            return function (d) {
                return d3.format('%')(d);
            };
        },
        xFunction: function () {
            return function (d) {
                return d.x;
            };
        },
        yFunction: function () {
            return function (d) {
                return d.y;
            };
        },
        getId: function () {
            return 'chart_' + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
    };
});

services.factory('VectorService', function () {
    return {
        getGuid: function () {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
    };
});

services.factory('DashboardService', function ($rootScope, $http, $interval, $log, $location, PMAPIService, MetricListService, flash, vectorConfig) {
    var intervalPromise,
        updateContext,
        cancelInterval,
        updateInterval,
        updateMetricsCallback,
        updateContextSuccessCallback,
        updateContextErrorCallback,
        loopErrors = 0,
        intervalFunction;

    cancelInterval = function () {
        if (intervalPromise) {
            $interval.cancel(intervalPromise);
            $log.info("Interval canceled.");
        }
    };

    updateInterval = function () {
        cancelInterval(intervalPromise);

        if ($rootScope.properties.host) {
            if ($rootScope.properties.context && $rootScope.properties.context > 0) {
                intervalPromise = $interval(intervalFunction, $rootScope.properties.interval * 1000);
            } else {
                flash.to('alert-dashboard-error').error = 'Invalid context. Please update host to resume operation.';
            }
            $log.info("Interval updated.");
        }
    };

    updateContextSuccessCallback = function (data) {
        $rootScope.flags.contextAvailable = true;
        $rootScope.properties.context = data;
        updateInterval();
        // fetch hostname
        PMAPIService.getMetrics(data, ["pmcd.hostname"])
            .then(function (metrics) {
                angular.forEach(metrics.values[0].instances, function (pair) {
                    $rootScope.properties.hostname = pair.value;
                    $log.info("Hostname updated: " + pair.value);
                });
            })
    };

    updateContextErrorCallback = function () {
        $rootScope.flags.contextAvailable = false;
        $log.error("Error fetching context.");
    };

    updateContext = function () {
        $log.info("Context updated.");

        var host = $rootScope.properties.host;

        if (host && host !== '') {
            $rootScope.flags.contextUpdating = true;
            $rootScope.flags.contextAvailable = false;
            PMAPIService.getHostspecContext($rootScope.properties.pmcd, 600)
                .then(function (data) {
                    $rootScope.flags.contextUpdating = false;
                    updateContextSuccessCallback(data);
                }, function errorHandler() {
                    flash.to('alert-dashboard-error').error = 'Failed fetching context from host. Try updating the hostname.';
                    $rootScope.flags.contextUpdating = false;
                    updateContextErrorCallback();
                });
        }
    };

    updateMetricsCallback = function (success) {
        if (!success) {
            loopErrors = loopErrors + 1;
        } else {
            loopErrors = 0;
        }
        if (loopErrors > 5) {
            cancelInterval(intervalPromise);
            loopErrors = 0;
            flash.to('alert-dashboard-error').error = 'Consistently failed fetching metrics from host (>5). Aborting loop. Please make sure PCP is running correctly.';
        }
    };

    intervalFunction = function () {
        MetricListService.updateMetrics(updateMetricsCallback);
        MetricListService.updateDerivedMetrics();
    };

    return {
        updateContext: updateContext,
        cancelInterval: cancelInterval,
        updateInterval: updateInterval,
        updateHost: function () {
            $log.info("Host updated.");

            $location.search('host', $rootScope.properties.host);
            $location.search('pmcd', $rootScope.properties.pmcd);

            $rootScope.properties.context = -1;

            MetricListService.clearMetricList();
            MetricListService.clearDerivedMetricList();

            updateContext();
        },
        updateWindow: function () {
            $log.log("Window updated.");
        },
        initializeProperties: function () {
            if ($rootScope.properties) {
                if (!$rootScope.properties.interval) {
                    $rootScope.properties.interval = vectorConfig.interval;
                }
                if (!$rootScope.properties.window) {
                    $rootScope.properties.window = vectorConfig.window;
                }
                if (!$rootScope.properties.host) {
                    $rootScope.properties.host = '';
                }
                if (!$rootScope.properties.pmcd) {
                    $rootScope.properties.pmcd = vectorConfig.pmcd;
                }
                if (!$rootScope.properties.context || $rootScope.properties.context < 0) {
                    updateContext();
                } else {
                    updateInterval();
                }
            } else {
                $rootScope.properties = {
                    host: '',
                    port: vectorConfig.port,
                    context: -1,
                    window: vectorConfig.window,
                    interval: vectorConfig.interval
                };
            }
            $rootScope.flags = {
              contextAvailable: false,
              contextUpdating: false
            };
        }
    };
});

services.factory('FlameGraphService', function ($log, $rootScope, $http, flash) {
    return {
        generate: function () {
            $http.get("http://" + $rootScope.properties.host + "/pmapi/" + $rootScope.properties.context + "/_fetch?names=generic.systack")
                .success(function () {
                    flash.to('alert-sysstack-success').success = 'generic.systack requested!';
                    $log.info("generic.systack requested");
                }).error(function () {
                    flash.to('alert-sysstack-error').error = 'failed requesting generic.systack!';
                    $log.error("failed requesting generic.systack");
                });
        }
    };
});

services.factory('HeatMapService', function ($log, $rootScope, $http, flash) {
    return {
        generate: function () {
            $http.get("http://" + $rootScope.properties.host + "/pmapi/" + $rootScope.properties.context + "/_fetch?names=generic.heatmap")
                .success(function () {
                    flash.to('alert-disklatency-success').success = 'generic.heatmap requested!';
                    $log.info("generic.heatmap requested");
                }).error(function () {
                    flash.to('alert-disklatency-error').error = 'failed requesting generic.heatmap!';
                    $log.error("failed requesting generic.heatmap");
                });
        }
    };
});
