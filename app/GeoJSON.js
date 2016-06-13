/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */

var limitQuery = 50;

var redraw = function(minMagnitude, maxMagnitude, minDate, maxDate, limit, layer)
{
	var currentTimeUTC = +new Date();
	var minDateISO = new Date(currentTimeUTC + minDate*24*60*60*1000).toISOString().split(/[-]+/);
	var maxDateISO = new Date(currentTimeUTC + maxDate*24*60*60*1000).toISOString().split(/[-]+/);
	minDateISO[minDateISO.length - 1] = minDateISO[minDateISO.length - 1].split('.')[0];
	maxDateISO[maxDateISO.length - 1] = maxDateISO[maxDateISO.length - 1].split('.')[0];

	layer.removeAllRenderables();

	var resourcesUrl = "http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson";
	var query = "starttime="+minDateISO.join('-')+"&endtime="+maxDateISO.join('-')+"&minmagnitude=" +
	            minMagnitude.toString() + "&maxmagnitude=" + maxMagnitude.toString() + "&orderby=magnitude&limit=" +
	            limit.toString();
	var polygonGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "&" + query);

	polygonGeoJSON.load(shapeConfigurationCallback, layer);
};


var shapeConfigurationCallback = function (geometry, properties)
{
	var configuration = {};

	var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
	placemarkAttributes.imageScale = 0.1;
	placemarkAttributes.imageColor = WorldWind.Color.WHITE;
	placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
		WorldWind.OFFSET_FRACTION, 0.5,
		WorldWind.OFFSET_FRACTION, 1.5);
	placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/white-dot.png";

	if (geometry.isPointType() || geometry.isMultiPointType())
	{
		configuration.attributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);

		/*
		 if (properties && properties.place)
		 {
		 configuration.name = properties.place;
		 }
		 */
		/*
		if (properties && properties.time)
		{
			var date = (+new Date(properties.time));
			var utcDate  = (+new Date());

			if (utcDate - date > (30*24*60*60*1000))
			{
				configuration.attributes.imageColor = WorldWind.Color.GREEN;
			}
			else if (utcDate - date > (8*24*60*60*1000))
			{
				configuration.attributes.imageColor = WorldWind.Color.YELLOW;
			}
			else if (utcDate - date > (24*60*60*1000))
			{
				configuration.attributes.imageColor = WorldWind.Color.ORANGE;
			}
			else
			{
				configuration.attributes.imageColor = WorldWind.Color.RED;
			}
		}
		*/
		if (properties && properties.mag)
		{
			var min = $("#magSlider").slider("values",0);
			var max = $("#magSlider").slider("values",1);
			configuration.attributes.imageScale = ((properties.mag - min + 1) / (max - min)) * 0.25;

			configuration.attributes.imageColor = WorldWind.Color.TRANSPARENT;
		}

		if (geometry && geometry['coordinates'])
		{
			geometry['coordinates'][2] *= 1000;



			var boundaries = [];
			boundaries[0] = []; // outer boundary
			var altitude = geometry['coordinates'][2]*-4 - 10000;
			var x = ((properties.mag - min + 1) / (max - min));
			boundaries[0].push(new WorldWind.Position(geometry['coordinates'][1]-x, geometry['coordinates'][0]-x, altitude));
			boundaries[0].push(new WorldWind.Position(geometry['coordinates'][1]-x, geometry['coordinates'][0]+x, altitude));
			boundaries[0].push(new WorldWind.Position(geometry['coordinates'][1]+x, geometry['coordinates'][0]+x, altitude));
			boundaries[0].push(new WorldWind.Position(geometry['coordinates'][1]+x, geometry['coordinates'][0]-x, altitude));

			var polygon = new WorldWind.Polygon(boundaries, null);
			polygon.altitudeMode = WorldWind.ABSOLUTE;
			polygon.extrude = true;
			polygon.textureCoordinates = [
				[new WorldWind.Vec2(0, 0), new WorldWind.Vec2(1, 0), new WorldWind.Vec2(1, 1), new WorldWind.Vec2(0, 1)]
			];

			var polygonAttributes = new WorldWind.ShapeAttributes(null);

			var date = (+new Date(properties.time));
			var utcDate  = (+new Date());

			if (utcDate - date > (30*24*60*60*1000))
			{
				polygonAttributes.interiorColor = WorldWind.Color.GREEN;
			}
			else if (utcDate - date > (8*24*60*60*1000))
			{
				polygonAttributes.interiorColor = WorldWind.Color.YELLOW;
			}
			else if (utcDate - date > (24*60*60*1000))
			{
				polygonAttributes.interiorColor = WorldWind.Color.ORANGE;
			}
			else
			{
				polygonAttributes.interiorColor = WorldWind.Color.RED;
			}

			polygonAttributes.drawInterior = true;
			polygonAttributes.drawOutline = false;

			polygonAttributes.drawVerticals = polygon.extrude;
			polygonAttributes.applyLighting = true;
			polygon.attributes = polygonAttributes;

			var highlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);
			highlightAttributes.outlineColor = WorldWind.Color.RED;
			polygon.highlightAttributes = highlightAttributes;

			window.wwd.layers[1].addRenderable(polygon);
		}
	}


	return configuration;
};



requirejs(['../src/WorldWind', './LayerManager', './AnnotationController', './CoordinateController'],
    function (ww, LayerManager, AnnotationController, CoordinateController)
    {
        "use strict";

	    var wwd = new WorldWind.WorldWindow("canvasOne");

	    window.wwd = wwd;

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);



	    var annotationController = new AnnotationController(wwd);

        var layers = [
	        {layer: new WorldWind.BMNGLayer(), enabled: true},
	        {layer: new WorldWind.RenderableLayer("Polygon"), enabled:true},


            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: false},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: false}
        ];
	    layers[1]['layer'].opacity = 1;
	    layers[0]['layer'].opacity = 0.01;

        for (var l = 0; l < layers.length; l++)
        {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

	    //wwd.addLayer(layers[1]['layer']);

	    var layerManger = new LayerManager(wwd);

	    var minMagnitude = $("#magSlider").slider("values",0);
	    var maxMagnitude = $("#magSlider").slider("values",1);
	    var minDate = $("#dateSlider").slider("values",0);
	    var maxDate = $("#dateSlider").slider("values",1);

	    window.redraw(minMagnitude,maxMagnitude,minDate,maxDate, window.limitQuery, layers[1]['layer']);

	    wwd.goTo(new WorldWind.Position(31.956578,35.945695,25500*1000))


    });