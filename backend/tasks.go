package main

import (
	"context"
	"net/http"
	"net/url"

	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"
	"google.golang.org/appengine/taskqueue"
)

func routeTasks(w http.ResponseWriter, r *http.Request) {
	var head string
	head, r.URL.Path = shiftPath(r.URL.Path)

	if head == "remove-sample-metadata" {
		switch r.Method {
		case http.MethodPost:
			routeTasksRemoveSampleMetadata(w, r)
			return
		default:
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
	}

	http.Error(w, "", http.StatusMethodNotAllowed)
}

func routeTasksRemoveSampleMetadata(w http.ResponseWriter, r *http.Request) {
	var batchSize = 250
	c := appengine.NewContext(r)
	cursorString := r.FormValue("cursor")
	metadataKeyString := r.FormValue("metadataKey")

	if metadataKeyString == "" {
		log.Errorf(c, "No metadata key given in request")
		http.Error(w, "Bad Request: No key", 400)
		return
	}

	err := datastore.RunInTransaction(c, func(c context.Context) error {
		metadataKey, err := datastore.DecodeKey(metadataKeyString)
		if err != nil {
			log.Criticalf(c, "Could not parse metadata key: %v", err)
			return err
		}

		q := datastore.NewQuery(metaDataKind).KeysOnly().Ancestor(metadataKey).Limit(batchSize)
		if cursorString != "" {
			cursor, err := datastore.DecodeCursor(cursorString)
			if err != nil {
				log.Criticalf(c, "Could not parse cursor: %v", err)
				return err
			}
			q = q.Start(cursor)
		}

		var sampleKeyArray []*datastore.Key
		t := q.Run(c)
		for {
			k, err := t.Next(nil)
			if err == datastore.Done {
				break
			}
			if err != nil {
				log.Errorf(c, "Error while getting metatada rows to be removed: %v", err)
				break
			}
			sampleKeyArray = append(sampleKeyArray, k)
		}

		if len(sampleKeyArray) > 0 {
			err = datastore.DeleteMulti(c, sampleKeyArray)
			if err != nil {
				log.Errorf(c, "Error while removing metatada rows: %v", err)
				return err
			}
		} else {
			log.Debugf(c, "No sample rows found to be removed")
			return nil
		}

		cursor, err := t.Cursor()
		if err != nil {
			log.Errorf(c, "Could not get cursor: %v", err)
			return err
		}

		newCursorString := cursor.String()
		if newCursorString != cursorString && len(sampleKeyArray) == batchSize {
			cursorString = newCursorString
			task := taskqueue.NewPOSTTask("/api/tasks/remove-sample-metadata",
				url.Values{"cursor": {cursorString}, "metadataKey": {metadataKeyString}})
			_, err := taskqueue.Add(c, task, "")
			if err != nil {
				log.Criticalf(c, "Could not add task to queue: %v", err)
				return err
			}
		}
		return nil
	}, nil)

	if err != nil {
		log.Errorf(c, "Transaction error %v", err)
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent) // 204
}
